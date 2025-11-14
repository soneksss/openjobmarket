"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import MapLocationPicker from "./map-location-picker"
import { X, ArrowLeft, ArrowRight, Eye, Briefcase, Hammer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Props = {
  companyProfile: any
  userType: "company" | "homeowner"
}

type JobFormData = {
  // Step 1: Active duration (subscription-based, no pricing)
  activeDuration: string
  // Step 2: Job posting type
  postingType: "employee" | "tradespeople"
  // Step 3: Job details
  profession: string
  shortDescription: string
  longDescription: string
  payMin: string
  payMax: string
  payFrequency: string
  trainingProvided: boolean
  jobPhoto: File | null
  jobPhotoUrl: string | null
  // Step 4: Location
  fullAddress: string
  locationCoords: { lat: number; lon: number } | null
}

const ACTIVE_DURATION_OPTIONS = [
  { value: "3_days", label: "3 days" },
  { value: "7_days", label: "7 days" },
  { value: "2_weeks", label: "2 weeks" },
  { value: "3_weeks", label: "3 weeks" },
  { value: "4_weeks", label: "4 weeks" },
]

const PAY_FREQUENCY_OPTIONS = [
  { value: "per_hour", label: "per hour" },
  { value: "per_day", label: "per day" },
  { value: "per_week", label: "per week" },
  { value: "per_month", label: "per month" },
  { value: "per_year", label: "per year" },
  { value: "per_job", label: "per job" },
]

// Comprehensive list of professions based on popular categories
const COMMON_PROFESSIONS = [
  // Tech & IT
  "Developer",
  "Software Engineer",
  "Web Designer",
  "Designer",
  "AI Specialist",
  "IT Support",
  "Data Analyst",
  "Cybersecurity",
  "Cybersecurity Specialist",
  "DevOps",
  "DevOps Engineer",
  // Healthcare
  "Nurse",
  "Carer",
  "Doctor",
  "Pharmacist",
  "Dentist",
  // Professional Services
  "Administrator",
  "Accountant",
  "Marketing",
  "Marketing Manager",
  "Sales",
  "Sales Representative",
  "HR Manager",
  "Lawyer",
  "Teacher",
  "Recruiter",
  "Consultant",
  "Architect",
  "Project Manager",
  "Customer Service",
  // Other Services
  "Chef",
  "Driver",
  "Warehouse",
  "Warehouse Operative",
  "Security",
  "Security Guard",
  "Photographer",
  "Barber",
  "Personal Trainer",
  "Event Planner",
]

// Comprehensive list of trades based on popular categories
const COMMON_TRADES = [
  // Trades
  "Plumber",
  "Electrician",
  "Builder",
  "Carpenter",
  "Painter",
  "Painter & Decorator",
  "Roofer",
  "Gardener",
  "Cleaner",
  "Handyman",
  "General Handyman",
  "Locksmith",
  "Bathrooms",
  "Bathroom Fitter",
  "Tiler",
  "Heating",
  "Heating Engineer",
  "Gas Boiler",
  "Gas Engineer",
  "Plasterer",
  "Driveways",
  "Driveway Specialist",
  "Fencing",
  "Tree Surgeon",
  "Windows/Doors",
  "Window Fitter",
  "Door Fitter",
  "Mechanic",
  "Flooring",
  "Flooring Specialist",
  "Kitchen Fitter",
  "HVAC",
  "HVAC Engineer",
  "Glazier",
  "Decorator",
  "Bricklayer",
  "Scaffolder",
  "Welder",
]

export default function JobWizardModal({ companyProfile, userType }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  const [formData, setFormData] = useState<JobFormData>({
    activeDuration: "",
    postingType: userType === "homeowner" ? "tradespeople" : "employee",
    profession: "",
    shortDescription: "",
    longDescription: "",
    payMin: "",
    payMax: "",
    payFrequency: "per_year",
    trainingProvided: false,
    jobPhoto: null,
    jobPhotoUrl: null,
    fullAddress: "",
    locationCoords: null,
  })

  const closeModal = () => {
    setOpen(false)
    router.push(userType === "company" ? "/dashboard/company" : "/dashboard/homeowner")
  }

  const handleMapLocationSelect = (location: { latitude: number; longitude: number; address: string } | null) => {
    if (location) {
      setFormData((prev) => ({
        ...prev,
        fullAddress: location.address,
        locationCoords: { lat: location.latitude, lon: location.longitude },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        fullAddress: "",
        locationCoords: null,
      }))
    }
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
      // Compress if larger than 1MB, otherwise just convert to JPEG
      console.log("[Job Wizard] Processing image from", (file.size / 1024 / 1024).toFixed(2), "MB")
      const processedFile = await compressImage(file, 1024 * 1024) // 1MB target, always convert to JPEG
      console.log("[Job Wizard] Processed to", (processedFile.size / 1024 / 1024).toFixed(2), "MB")

      // Create preview URL
      const previewUrl = URL.createObjectURL(processedFile)
      setFormData((prev) => ({
        ...prev,
        jobPhoto: processedFile,
        jobPhotoUrl: previewUrl,
      }))
    } catch (error) {
      console.error("[Job Wizard] Error processing image:", error)
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
          // Maintain original dimensions
          canvas.width = img.width
          canvas.height = img.height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

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
                } else {
                  // Create new file with compressed blob (always JPEG)
                  // Replace original extension with .jpg
                  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
                  const jpegFileName = `${nameWithoutExt}.jpg`

                  const compressedFile = new File(
                    [blob],
                    jpegFileName,
                    { type: 'image/jpeg', lastModified: Date.now() }
                  )
                  resolve(compressedFile)
                }
              },
              'image/jpeg', // Always create JPEG blob
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
    if (formData.jobPhotoUrl) {
      URL.revokeObjectURL(formData.jobPhotoUrl)
    }
    setFormData((prev) => ({
      ...prev,
      jobPhoto: null,
      jobPhotoUrl: null,
    }))
  }

  const validateStep = (step: number): boolean => {
    setErr(null)

    switch (step) {
      case 1:
        if (!formData.postingType) {
          setErr("Please select a job posting type.")
          return false
        }
        break
      case 2:
        if (!formData.activeDuration) {
          setErr("Please select how long you want your job posting to be active.")
          return false
        }
        break
      case 3:
        // Check if profession is entered
        if (!formData.profession.trim()) {
          setErr("Please enter the profession/trade/field.")
          return false
        }
        if (!formData.shortDescription.trim()) {
          setErr("Please enter a short description.")
          return false
        }
        break
      case 4:
        if (!formData.locationCoords) {
          setErr("Please select a location on the map. This is mandatory.")
          return false
        }
        break
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      // If on step 1 and vacancy is selected, redirect to vacancy form
      if (currentStep === 1 && formData.postingType === "employee") {
        router.push("/jobs/vacancy/new")
        return
      }
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, userType === "homeowner" ? 1 : 1))
    setErr(null)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)

    try {
      // Check subscription limits
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErr("Authentication required.")
        setLoading(false)
        return
      }

      const { data: canPost, error: checkError } = await supabase
        .rpc("can_user_post_job", { user_id_param: user.id })

      if (checkError) {
        console.error("Error checking job posting permission:", checkError)
        setErr("Failed to verify posting permissions.")
        setLoading(false)
        return
      }

      if (!canPost.can_post) {
        if (canPost.reason === 'no_subscription') {
          setErr("You need an active subscription to post jobs. Please visit the Subscription page.")
          setLoading(false)
          return
        } else if (canPost.reason === 'job_limit_exceeded') {
          setErr(`You have reached your job posting limit (${canPost.jobs_used}/${canPost.jobs_limit}). Please upgrade your subscription.`)
          setLoading(false)
          return
        } else {
          setErr("You are not authorized to post jobs at this time.")
          setLoading(false)
          return
        }
      }

      // Calculate expiration date (maximum 4 weeks = 28 days)
      const expirationDate = new Date()
      const planDays = {
        "3_days": 3,
        "7_days": 7,
        "2_weeks": 14,
        "3_weeks": 21,
        "4_weeks": 28,
      }
      const requestedDays = planDays[formData.activeDuration as keyof typeof planDays] || 28
      const daysToAdd = Math.min(requestedDays, 28) // Enforce maximum 4 weeks
      expirationDate.setDate(expirationDate.getDate() + daysToAdd)

      // Upload job photo if provided
      let jobPhotoPublicUrl: string | null = null
      if (formData.jobPhoto && formData.postingType === "tradespeople") {
        try {
          console.log("[Job Wizard] Uploading job photo...")
          console.log("[Job Wizard] File details:", {
            name: formData.jobPhoto.name,
            type: formData.jobPhoto.type,
            size: (formData.jobPhoto.size / 1024 / 1024).toFixed(2) + " MB"
          })
          // Always use .jpg extension since we convert all images to JPEG
          // Use folder structure to match RLS policy: {userId}/filename.jpg
          const fileName = `${user.id}/${Date.now()}.jpg`
          const filePath = fileName

          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(filePath, formData.jobPhoto, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg'
            })

          if (uploadError) {
            console.error("[Job Wizard] Photo upload error:", uploadError)
            // Don't fail the entire job posting if photo upload fails
            console.warn("[Job Wizard] Continuing without photo")
          } else {
            const { data: urlData } = supabase.storage
              .from('job-photos')
              .getPublicUrl(filePath)

            jobPhotoPublicUrl = urlData.publicUrl
            console.log("[Job Wizard] Photo uploaded successfully:", jobPhotoPublicUrl)
          }
        } catch (photoError) {
          console.error("[Job Wizard] Photo upload exception:", photoError)
          // Continue without photo
        }
      }

      // Prepare job description
      const fullDescription = formData.longDescription.trim()
        ? `${formData.shortDescription}\n\n${formData.longDescription}`
        : formData.shortDescription

      const payload: any = {
        company_id: userType === "company" ? companyProfile.id : null,
        homeowner_id: userType === "homeowner" ? companyProfile.id : null,
        title: formData.profession.trim(),
        location: formData.fullAddress,
        latitude: formData.locationCoords?.lat || null,
        longitude: formData.locationCoords?.lon || null,
        work_location: "onsite",
        description: fullDescription,
        short_description: formData.shortDescription,
        country: "United Kingdom",
        job_type: formData.postingType === "tradespeople" ? "contract" : "full-time",
        experience_level: "entry", // Default to entry level (field will be made optional in SQL)
        is_tradespeople_job: formData.postingType === "tradespeople",
        salary_min: formData.payMin ? Number.parseInt(formData.payMin) : null,
        salary_max: formData.payMax ? Number.parseInt(formData.payMax) : null,
        salary_period: formData.payFrequency,
        is_active: true,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString(),
      }

      // Add photo URL if uploaded
      if (jobPhotoPublicUrl) {
        payload.job_photo_url = jobPhotoPublicUrl
      }

      console.log("[Job Wizard] Submitting job:", payload)

      const { data, error } = await supabase.from("jobs").insert(payload).select().limit(1).single()

      if (error) {
        console.error("[Job Wizard] Insert job error:", error)
        console.error("[Job Wizard] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setErr(`Failed to post job: ${error.message}`)
        setLoading(false)
        return
      }

      console.log("[Job Wizard] Job posted successfully:", data)

      // Show success toast notification
      toast({
        title: "✅ Job Posted Successfully!",
        description: `Your job will be active until ${expirationDate.toLocaleDateString()}`,
        variant: "default",
      })

      // Redirect to dashboard
      router.push(userType === "company" ? "/dashboard/company" : "/dashboard/homeowner")
      router.refresh()
    } catch (err: any) {
      console.error("[Job Wizard] Unexpected error:", err)
      setErr(err?.message || "An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Skip this step for homeowners - they only post tradespeople jobs
        if (userType === "homeowner") {
          setCurrentStep(2)
          return null
        }
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What are you posting?</h3>
            <p className="text-sm text-gray-600">Choose between posting a Vacancy (employee position) or Job/Task (one-time work)</p>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 shadow-sm hover:shadow-md ${
                  formData.postingType === "employee"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="postingType"
                  value="employee"
                  checked={formData.postingType === "employee"}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      postingType: "employee",
                      payFrequency: "per_year", // Default for employees
                    }))
                  }}
                  className="sr-only"
                />
                <Briefcase className="w-12 h-12 mb-3 text-blue-600" />
                <span className="font-semibold text-lg">Vacancy</span>
                <span className="text-sm text-gray-600 text-center mt-2">Hiring employees for permanent/contract positions</span>
              </label>

              <label
                className={`flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-orange-300 shadow-sm hover:shadow-md ${
                  formData.postingType === "tradespeople"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="postingType"
                  value="tradespeople"
                  checked={formData.postingType === "tradespeople"}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      postingType: "tradespeople",
                      payFrequency: "per_job", // Default for tradespeople
                    }))
                  }}
                  className="sr-only"
                />
                <Hammer className="w-12 h-12 mb-3 text-orange-600" />
                <span className="font-semibold text-lg">Job/Task</span>
                <span className="text-sm text-gray-600 text-center mt-2">Hiring tradespeople/contractors for specific work</span>
              </label>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How long do you want your {formData.postingType === "employee" ? "vacancy" : "job/task"} to be active?</h3>
            <p className="text-sm text-gray-600">Select the duration based on your subscription plan</p>
            <div className="space-y-3">
              {ACTIVE_DURATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 shadow-sm hover:shadow-md ${
                    formData.activeDuration === option.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="activeDuration"
                      value={option.value}
                      checked={formData.activeDuration === option.value}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          activeDuration: e.target.value,
                        }))
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="font-medium">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )

      case 3:
        const professionsList = formData.postingType === "tradespeople" ? COMMON_TRADES : COMMON_PROFESSIONS

        // Handle profession input change with autocomplete
        const handleProfessionChange = (value: string) => {
          setFormData((prev) => ({ ...prev, profession: value }))

          // Filter suggestions based on input
          if (value.trim().length > 0) {
            const filtered = professionsList.filter((prof) =>
              prof.toLowerCase().includes(value.toLowerCase())
            )
            setFilteredSuggestions(filtered)
            setShowSuggestions(true)
          } else {
            setFilteredSuggestions([])
            setShowSuggestions(false)
          }
        }

        // Handle suggestion click
        const handleSuggestionClick = (suggestion: string) => {
          setFormData((prev) => ({ ...prev, profession: suggestion }))
          setShowSuggestions(false)
          setFilteredSuggestions([])
        }

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{formData.postingType === "employee" ? "Vacancy" : "Job/Task"} Details</h3>

            <div className="relative">
              <label className="block text-sm font-medium mb-2">
                {formData.postingType === "tradespeople" ? "Trade / Service" : "Profession / Field"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.profession}
                onChange={(e) => handleProfessionChange(e.target.value)}
                onFocus={() => {
                  // Show all suggestions when focused if input is empty
                  if (formData.profession.trim().length === 0) {
                    setFilteredSuggestions(professionsList)
                    setShowSuggestions(true)
                  } else {
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow click events to fire
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
                placeholder={formData.postingType === "tradespeople" ? "Type a trade (e.g., Plumber, Electrician)" : "Type a profession (e.g., Software Engineer, Designer)"}
                className="w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Start typing to see suggestions, or enter your own
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Short Description (shown in previews) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full h-24 border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Brief description of the job (1-2 sentences)"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.shortDescription.length}/200 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Long Description (optional)
              </label>
              <textarea
                value={formData.longDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, longDescription: e.target.value }))}
                className="w-full h-32 border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Detailed description including requirements, responsibilities, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pay (optional)</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Minimum £</label>
                  <input
                    type="number"
                    value={formData.payMin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMin: e.target.value }))}
                    className="w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Maximum £</label>
                  <input
                    type="number"
                    value={formData.payMax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMax: e.target.value }))}
                    className="w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Frequency</label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payFrequency: e.target.value }))}
                    className="w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PAY_FREQUENCY_OPTIONS
                      .filter((option) => {
                        // For tradespeople/tasks, only show per_job, per_hour, per_day
                        if (formData.postingType === "tradespeople") {
                          return ["per_job", "per_hour", "per_day"].includes(option.value)
                        }
                        // For employees/vacancies, show all options
                        return true
                      })
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Photo Upload - Only for tradespeople/tasks */}
              {formData.postingType === "tradespeople" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Job Photo (optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Add a photo to help tradespeople understand the job better
                  </p>
                  {!formData.jobPhotoUrl ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="job-photo-upload"
                      />
                      <label htmlFor="job-photo-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <svg
                            className="w-12 h-12 text-gray-400 mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">Click to upload photo</span>
                          <span className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG</span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={formData.jobPhotoUrl}
                        alt="Job preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Training Provided Checkbox - Only for employee vacancies */}
              {formData.postingType === "employee" && (
                <div className="mt-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trainingProvided}
                      onChange={(e) => setFormData((prev) => ({ ...prev, trainingProvided: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Training Provided</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Check this if training will be provided for this position
                  </p>
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location</h3>
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> You must select a location on the map. This is mandatory.
            </p>

            <div>
              <label className="block text-sm font-medium mb-2">Full Address (optional)</label>
              <input
                type="text"
                value={formData.fullAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullAddress: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                placeholder="Enter full street address (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location on Map <span className="text-red-500">*</span>
              </label>
              <MapLocationPicker
                value={formData.locationCoords ? {
                  latitude: formData.locationCoords.lat,
                  longitude: formData.locationCoords.lon,
                  address: formData.fullAddress
                } : null}
                onChange={handleMapLocationSelect}
                height="400px"
                placeholder="Click on the map to select your job location (mandatory)"
              />
              {formData.locationCoords && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Location selected: {formData.locationCoords.lat.toFixed(4)}, {formData.locationCoords.lon.toFixed(4)}
                </p>
              )}
            </div>

            {/* Job Summary */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Job Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Job Title:</span>
                  <span className="font-medium text-gray-900">{formData.profession || "Not set"}</span>
                </div>
                {formData.payMin && formData.payMax && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium text-gray-900">
                      £{formData.payMin} - £{formData.payMax} {formData.payFrequency.replace('_', ' ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px] truncate">
                    {formData.shortDescription || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Photo Attached:</span>
                  <span className={`font-medium ${formData.jobPhotoUrl ? "text-green-600" : "text-gray-400"}`}>
                    {formData.jobPhotoUrl ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Duration:</span>
                  <span className="font-medium text-gray-900">
                    {formData.activeDuration.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                {companyProfile?.logo_url && userType === "company" && (
                  <img
                    src={companyProfile.logo_url}
                    alt="Company logo"
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold">Post a Job</h2>
                  <p className="text-sm text-gray-500">Step {currentStep} of 4</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-6 py-4 border-b">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {renderStep()}
              {err && <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">{err}</div>}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Publishing..." : "Publish Job"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
