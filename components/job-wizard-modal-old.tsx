"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { LocationInput } from "./location-input"
import MapLocationPicker from "./map-location-picker"
import { X, ArrowLeft, ArrowRight, Eye, Check, Map, MapPin } from "lucide-react"
import PaymentModal from "./payment-modal"

type Props = {
  companyProfile: any
}

type JobFormData = {
  // Step 1: Recruitment timeline with pricing
  recruitmentTimeline: string
  price: number
  // Step 2: Hiring count
  hiringCount: number
  // Step 3: Job type
  jobTypes: string[]
  // Step 4: Pay
  salaryMin: string
  salaryMax: string
  salaryFrequency: string
  // Step 6: Job description
  description: string
  experienceLevel: string
  // Optional additional fields
  benefits: string[]
  responsibilities: string[]
  essentialSkills: string[]
  // Basic info from original form
  title: string
  country: string
  locationType: string
  locationText: string
  locationCoords: { lat: number; lon: number } | null
}

// Price adjustment logic based on admin settings with individual pricing
const adjustPriceBasedOnAdminSettings = (
  originalPrice: number,
  duration: string,
  adminSettings: { isFreeByDefault: boolean; defaultPrice: number; prices?: { [key: string]: number } }
) => {
  // If admin has individual prices set, use those
  if (adminSettings.prices && adminSettings.prices[duration] !== undefined) {
    const adminPrice = adminSettings.prices[duration]

    // Special case: if admin has set jobs free by default, 3_days should be 0
    if (adminSettings.isFreeByDefault && duration === "3_days") {
      return {
        adjustedPrice: 0,
        wasAdjusted: originalPrice > 0 || adminPrice > 0,
        reason: "Admin has set 3-day postings to be free"
      }
    }

    // Use admin-specified price for this duration
    if (adminPrice !== originalPrice) {
      return {
        adjustedPrice: adminPrice,
        wasAdjusted: true,
        reason: `Admin has set ${duration.replace('_', ' ')} price to £${adminPrice}`
      }
    }
  }

  // Fallback to legacy logic for backwards compatibility
  if (adminSettings.isFreeByDefault && duration === "3_days") {
    return {
      adjustedPrice: 0,
      wasAdjusted: originalPrice > 0,
      reason: "Admin has set all job postings to be free"
    }
  }

  // If original price is 0 but admin default price exists, use admin default
  if (originalPrice === 0 && adminSettings.defaultPrice > 0 && duration === "3_days") {
    return {
      adjustedPrice: adminSettings.defaultPrice,
      wasAdjusted: true,
      reason: `Admin default price of £${adminSettings.defaultPrice} applied`
    }
  }

  return {
    adjustedPrice: originalPrice,
    wasAdjusted: false,
    reason: null
  }
}

const getRecruitmentTimelineOptions = (
  isFreeByDefault: boolean,
  defaultPrice: number,
  adminPrices?: { [key: string]: number }
) => {
  const baseOptions = [
    { value: "3_days", label: "3 days", basePrice: 0 },
    { value: "7_days", label: "7 days", basePrice: 10 },
    { value: "2_weeks", label: "2 weeks", basePrice: 15 },
    { value: "3_weeks", label: "3 weeks", basePrice: 20 },
    { value: "4_weeks", label: "4 weeks", basePrice: 25 },
  ]

  const adminSettings = { isFreeByDefault, defaultPrice, prices: adminPrices }

  return baseOptions.map((option) => {
    // Apply admin price adjustment for each duration individually
    const priceAdjustment = adjustPriceBasedOnAdminSettings(
      option.basePrice,
      option.value,
      adminSettings
    )

    const finalPrice = priceAdjustment.adjustedPrice

    return {
      ...option,
      price: finalPrice,
      originalPrice: option.basePrice,
      displayPrice: finalPrice === 0 ? "Free" : `£${finalPrice}`,
      wasAdjusted: priceAdjustment.wasAdjusted,
      adjustmentReason: priceAdjustment.reason
    }
  })
}

const JOB_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Permanent",
  "Temporary",
  "Fixed-term contract",
  "Apprenticeship",
  "Freelance",
  "Zero-hours contract",
  "Graduate",
  "Volunteer",
  "Internship",
]

const SALARY_FREQUENCY_OPTIONS = [
  { value: "per_hour", label: "per hour" },
  { value: "per_day", label: "per day" },
  { value: "per_week", label: "per week" },
  { value: "per_month", label: "per month" },
  { value: "per_year", label: "per year" },
  { value: "per_job", label: "per job" },
]

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "apprentice", label: "Apprentice" },
  { value: "entry", label: "Entry level" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "director", label: "Director" },
]

const mapJobTypeToDatabase = (displayValue: string): string => {
  const mapping: { [key: string]: string } = {
    "Full-time": "full-time",
    "Part-time": "part-time",
    Permanent: "full-time", // Map to closest enum value
    Temporary: "contract",
    "Fixed-term contract": "contract",
    Apprenticeship: "internship", // Map to closest enum value
    Freelance: "freelance",
    "Zero-hours contract": "part-time", // Map to closest enum value
    Graduate: "full-time", // Map to closest enum value
    Volunteer: "internship", // Map to closest enum value
    Internship: "internship",
  }
  return mapping[displayValue] || "full-time" // Default fallback
}

const mapWorkLocationToDatabase = (displayValue: string): string => {
  const mapping: { [key: string]: string } = {
    in_person: "onsite",
    remote: "remote",
    hybrid: "hybrid",
  }
  return mapping[displayValue] || "onsite" // Default fallback
}

export default function JobWizardModal({ companyProfile }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [adminSettings, setAdminSettings] = useState({
    isFreeByDefault: true,
    defaultPrice: 0,
    prices: {} as { [key: string]: number }
  })
  const [recruitmentOptions, setRecruitmentOptions] = useState(getRecruitmentTimelineOptions(true, 0, {}))

  const [formData, setFormData] = useState<JobFormData>({
    recruitmentTimeline: "",
    price: 0, // Added price field
    hiringCount: 1,
    jobTypes: [],
    salaryMin: "",
    salaryMax: "",
    salaryFrequency: "per_year",
    description: "",
    experienceLevel: "",
    benefits: [],
    responsibilities: [],
    essentialSkills: [],
    title: "",
    country: "United Kingdom",
    locationType: "in_person",
    locationText: "",
    locationCoords: null,
  })

  const [useMapPicker, setUseMapPicker] = useState(false)

  // Load admin settings on component mount and refresh pricing
  useEffect(() => {
    async function loadAdminSettings() {
      try {
        console.log("[JOB-WIZARD] Loading admin settings for price comparison...")
        const { data, error } = await supabase.rpc("get_job_posting_pricing")

        if (error) {
          console.error("Error loading admin settings:", error)
          // Use defaults if there's an error
          return
        }

        if (data) {
          const settings = {
            isFreeByDefault: data.is_free,
            defaultPrice: data.default_price,
            prices: data.prices || {}
          }
          console.log("[JOB-WIZARD] Admin settings loaded:", settings)
          setAdminSettings(settings)

          // Update recruitment options with admin price adjustments
          const updatedOptions = getRecruitmentTimelineOptions(
            settings.isFreeByDefault,
            settings.defaultPrice,
            settings.prices
          )
          setRecruitmentOptions(updatedOptions)

          // If user already selected an option, update the price in form data
          if (formData.recruitmentTimeline) {
            const selectedOption = updatedOptions.find(opt => opt.value === formData.recruitmentTimeline)
            if (selectedOption) {
              setFormData(prev => ({
                ...prev,
                price: selectedOption.price
              }))
              console.log("[JOB-WIZARD] Updated form price based on admin settings:", selectedOption.price)
            }
          }
        }
      } catch (err) {
        console.error("Exception loading admin settings:", err)
        // Continue with defaults
      }
    }

    loadAdminSettings()
  }, [])

  // Function to manually refresh admin settings (for future admin panel integration)
  const refreshAdminSettings = async () => {
    try {
      const { data, error } = await supabase.rpc("get_job_posting_pricing")
      if (error) throw error

      if (data) {
        const settings = {
          isFreeByDefault: data.is_free,
          defaultPrice: data.default_price,
          prices: data.prices || {}
        }
        setAdminSettings(settings)
        setRecruitmentOptions(getRecruitmentTimelineOptions(
          settings.isFreeByDefault,
          settings.defaultPrice,
          settings.prices
        ))
        console.log("[JOB-WIZARD] Admin settings refreshed:", settings)
      }
    } catch (err) {
      console.error("Failed to refresh admin settings:", err)
    }
  }

  const closeModal = () => {
    setOpen(false)
    router.push("/dashboard/company")
  }

  const handleLocationSelect = (location: string, lat: number, lon: number) => {
    setFormData((prev) => ({
      ...prev,
      locationText: location,
      locationCoords: { lat, lon },
    }))
  }

  const handleMapLocationSelect = (location: { latitude: number; longitude: number; address: string } | null) => {
    if (location) {
      setFormData((prev) => ({
        ...prev,
        locationText: location.address,
        locationCoords: { lat: location.latitude, lon: location.longitude },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        locationText: "",
        locationCoords: null,
      }))
    }
  }



  const validateStep = (step: number): boolean => {
    setErr(null)

    switch (step) {
      case 1:
        if (!formData.recruitmentTimeline) {
          setErr("Please select a recruitment timeline.")
          return false
        }
        break
      case 2:
        if (formData.hiringCount < 1 || formData.hiringCount > 10) {
          setErr("Hiring count must be between 1 and 10.")
          return false
        }
        break
      case 3:
        if (formData.jobTypes.length === 0) {
          setErr("Please select at least one job type.")
          return false
        }
        break
      case 4:
        if (!formData.salaryMin || !formData.salaryMax) {
          setErr("Please enter both minimum and maximum salary.")
          return false
        }
        if (Number.parseInt(formData.salaryMin) >= Number.parseInt(formData.salaryMax)) {
          setErr("Maximum salary must be higher than minimum salary.")
          return false
        }
        break
      case 5:
        if (!formData.description.trim()) {
          setErr("Please enter a job description.")
          return false
        }
        break
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5))
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setErr(null)
  }

  const handleSubmit = async () => {
    if (!validateStep(5)) return

    // Validate basic job info
    if (!formData.title.trim()) {
      setErr("Job title is required.")
      return
    }
    if (
      (formData.locationType === "in_person" || formData.locationType === "hybrid") &&
      !formData.locationText.trim()
    ) {
      setErr("Please enter a job location.")
      return
    }
    if ((formData.locationType === "in_person" || formData.locationType === "hybrid") && !formData.locationCoords) {
      setErr("Please select a valid location from the suggestions.")
      return
    }

    // Check subscription limits before proceeding
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErr("Authentication required.")
        return
      }

      const { data: canPost, error: checkError } = await supabase
        .rpc("can_user_post_job", { user_id_param: user.id })

      if (checkError) {
        console.error("Error checking job posting permission:", checkError)
        setErr("Failed to verify posting permissions.")
        return
      }

      if (!canPost.can_post) {
        if (canPost.reason === 'no_subscription') {
          setErr("You need an active subscription to post jobs. Please visit the Subscription page to purchase a plan.")
          return
        } else if (canPost.reason === 'job_limit_exceeded') {
          setErr(`You have reached your job posting limit (${canPost.jobs_used}/${canPost.jobs_limit}). Please upgrade your subscription or wait for your current plan to renew.`)
          return
        } else {
          setErr("You are not authorized to post jobs at this time.")
          return
        }
      }

      // Log the final price being used after admin adjustments
      console.log("[JOB-WIZARD] Final job submission - Price after admin comparison:", {
        originalPrice: recruitmentOptions.find(opt => opt.value === formData.recruitmentTimeline)?.originalPrice,
        adjustedPrice: formData.price,
        wasAdjusted: recruitmentOptions.find(opt => opt.value === formData.recruitmentTimeline)?.wasAdjusted,
        adminSettings: adminSettings
      })

      if (formData.price === 0) {
        console.log("[JOB-WIZARD] Processing as free job (price = 0)")
        await handleFreeJobPublish()
      } else {
        console.log("[JOB-WIZARD] Processing as paid job, showing payment modal")
        setShowPaymentModal(true)
      }
    } catch (err: any) {
      console.error("Error checking subscription:", err)
      setErr("Failed to verify subscription status.")
    }
  }

  const handleFreeJobPublish = async () => {
    setLoading(true)

    try {
      // Calculate expiration date based on selected recruitment timeline
      const expirationDate = new Date()
      const planDays = {
        "3_days": 3,
        "7_days": 7,
        "2_weeks": 14,
        "3_weeks": 21,
        "4_weeks": 28,
      }
      const daysToAdd = planDays[formData.recruitmentTimeline as keyof typeof planDays] || 7
      expirationDate.setDate(expirationDate.getDate() + daysToAdd)

      const payload = {
        company_id: companyProfile.id,
        title: formData.title,
        location: formData.locationText,
        latitude: formData.locationCoords?.lat || null,
        longitude: formData.locationCoords?.lon || null,
        work_location: mapWorkLocationToDatabase(formData.locationType),
        description: formData.description,
        country: formData.country,
        recruitment_timeline: formData.recruitmentTimeline,
        price: formData.price,
        hiring_count: formData.hiringCount,
        job_type: mapJobTypeToDatabase(formData.jobTypes[0]),
        salary_min: Number.parseInt(formData.salaryMin),
        salary_max: Number.parseInt(formData.salaryMax),
        salary_frequency: formData.salaryFrequency,
        experience_level: formData.experienceLevel,
        benefits: formData.benefits.filter(b => b.trim() !== ""),
        responsibilities: formData.responsibilities.filter(r => r.trim() !== ""),
        essential_skills: formData.essentialSkills.filter(s => s.trim() !== ""),
        is_active: true,
        expires_at: expirationDate.toISOString(), // Set expiration for free jobs
        created_at: new Date().toISOString(),
        payment_data: {
          paymentMethod: "free_plan",
          timestamp: new Date().toISOString(),
          transactionId: null,
        },
        original_plan_type: "free",
      }

      console.log("[v0] Job payload:", payload)

      const { data, error } = await supabase.from("jobs").insert(payload).select().limit(1).single()

      if (error) {
        console.error("Insert job error:", error)
        setErr(error.message)
        setLoading(false)
        return
      }

      // Increment job usage counter if subscriptions are enabled
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc("increment_subscription_usage", {
          user_id_param: user.id,
          usage_type: "job"
        })
      }

      // Show success message and redirect
      alert(
        `Your job has been posted under the Free 3-Day Plan. It will expire on ${expirationDate.toLocaleDateString()}.`,
      )
      router.push("/dashboard/company")
    } catch (err: any) {
      console.error(err)
      setErr(err?.message || "Unexpected error")
      setLoading(false)
    }
  }

  const handlePaymentComplete = async (paymentData: any) => {
    setLoading(true)

    try {
      const expirationDate = new Date()
      const planDays = {
        "3_days": 3,
        "7_days": 7,
        "2_weeks": 14,
        "3_weeks": 21,
        "4_weeks": 28,
      }
      const daysToAdd = planDays[formData.recruitmentTimeline as keyof typeof planDays] || 7
      expirationDate.setDate(expirationDate.getDate() + daysToAdd)

      const payload = {
        company_id: companyProfile.id,
        title: formData.title,
        location: formData.locationText,
        latitude: formData.locationCoords?.lat || null,
        longitude: formData.locationCoords?.lon || null,
        work_location: mapWorkLocationToDatabase(formData.locationType),
        description: formData.description,
        country: formData.country,
        recruitment_timeline: formData.recruitmentTimeline,
        price: formData.price,
        hiring_count: formData.hiringCount,
        job_type: mapJobTypeToDatabase(formData.jobTypes[0]),
        salary_min: Number.parseInt(formData.salaryMin),
        salary_max: Number.parseInt(formData.salaryMax),
        salary_frequency: formData.salaryFrequency,
        experience_level: formData.experienceLevel,
        benefits: formData.benefits.filter(b => b.trim() !== ""),
        responsibilities: formData.responsibilities.filter(r => r.trim() !== ""),
        essential_skills: formData.essentialSkills.filter(s => s.trim() !== ""),
        is_active: true,
        expires_at: expirationDate.toISOString(), // Set expiration for all jobs
        created_at: new Date().toISOString(),
        payment_data: paymentData,
        original_plan_type: formData.price === 0 ? "free" : "paid",
      }

      const { data, error } = await supabase.from("jobs").insert(payload).select().limit(1).single()

      if (error) {
        console.error("Insert job error:", error)
        setErr(error.message)
        setLoading(false)
        return
      }

      // Increment job usage counter if subscriptions are enabled
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc("increment_subscription_usage", {
          user_id_param: user.id,
          usage_type: "job"
        })
      }

      setShowPaymentModal(false)
      if (formData.price === 0) {
        const selectedOption = recruitmentOptions.find(opt => opt.value === formData.recruitmentTimeline)
        const duration = selectedOption ? selectedOption.label.toLowerCase() : 'selected duration'
        alert(
          `Your job has been posted for ${duration} (Free Plan). It will expire on ${expirationDate.toLocaleDateString()}.`,
        )
      }
      router.push(`/jobs/${data.id}`)
    } catch (err: any) {
      console.error(err)
      setErr(err?.message || "Unexpected error")
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recruitment timeline for this job</h3>
            <p className="text-sm text-gray-600">Choose how long you want your job posting to be active</p>
            <div className="space-y-3">
              {recruitmentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                    formData.recruitmentTimeline === option.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="recruitmentTimeline"
                      value={option.value}
                      checked={formData.recruitmentTimeline === option.value}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          recruitmentTimeline: e.target.value,
                          price: option.price,
                        }))
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{option.label}</span>
                      <p className="text-sm text-gray-500">Active for {option.label.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${option.price === 0 ? "text-green-600" : "text-blue-600"}`}>
                        {option.displayPrice}
                      </span>
                      {formData.recruitmentTimeline === option.value && <Check className="w-5 h-5 text-blue-600" />}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {formData.recruitmentTimeline && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Selected:</strong>{" "}
                  {recruitmentOptions.find((o) => o.value === formData.recruitmentTimeline)?.label} -{" "}
                  {recruitmentOptions.find((o) => o.value === formData.recruitmentTimeline)?.displayPrice}
                </p>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Number of people to hire in the next 30 days</h3>
            <select
              value={formData.hiringCount}
              onChange={(e) => setFormData((prev) => ({ ...prev, hiringCount: Number.parseInt(e.target.value) }))}
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Job type</h3>
            <div className="grid grid-cols-2 gap-3">
              {JOB_TYPE_OPTIONS.map((type) => (
                <label key={type} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.jobTypes.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData((prev) => ({ ...prev, jobTypes: [...prev.jobTypes, type] }))
                      } else {
                        setFormData((prev) => ({ ...prev, jobTypes: prev.jobTypes.filter((t) => t !== type) }))
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pay</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minimum £</label>
                <input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salaryMin: e.target.value }))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maximum £</label>
                <input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salaryMax: e.target.value }))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select
                value={formData.salaryFrequency}
                onChange={(e) => setFormData((prev) => ({ ...prev, salaryFrequency: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SALARY_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            {/* Job basics - moved to top */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Job Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Job title*</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>United Kingdom</option>
                    <option>United States</option>
                    <option>Germany</option>
                    <option>France</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Job location type*</label>
                <select
                  value={formData.locationType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, locationType: e.target.value }))}
                  className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="in_person">In person</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {(formData.locationType === "in_person" || formData.locationType === "hybrid") && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Job location (street or postcode)*</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setUseMapPicker(false)}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors ${
                          !useMapPicker
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <MapPin className="h-3 w-3" />
                        Text Input
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseMapPicker(true)}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-colors ${
                          useMapPicker
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Map className="h-3 w-3" />
                        Map Picker
                      </button>
                    </div>
                  </div>

                  {useMapPicker ? (
                    <MapLocationPicker
                      value={formData.locationCoords ? {
                        latitude: formData.locationCoords.lat,
                        longitude: formData.locationCoords.lon,
                        address: formData.locationText
                      } : null}
                      onChange={handleMapLocationSelect}
                      height="350px"
                      placeholder="Click on the map to select your job location"
                    />
                  ) : (
                    <LocationInput
                      value={formData.locationText}
                      onChange={(value) => setFormData((prev) => ({ ...prev, locationText: value }))}
                      onLocationSelect={handleLocationSelect}
                      placeholder="Enter postcode or address"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Job description */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Job description*</h4>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full h-32 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the role and what makes this opportunity special..."
              />
            </div>

            {/* Experience level - optional */}
            <div>
              <label className="block text-sm font-medium mb-2">Experience level</label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => setFormData((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select experience level</option>
                {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Benefits - optional */}
            <div>
              <label className="block text-sm font-medium mb-2">Benefits (optional)</label>
              <div className="space-y-2">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => {
                        const newBenefits = [...formData.benefits]
                        newBenefits[index] = e.target.value
                        setFormData((prev) => ({ ...prev, benefits: newBenefits }))
                      }}
                      className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Health insurance, Flexible working hours"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newBenefits = formData.benefits.filter((_, i) => i !== index)
                        setFormData((prev) => ({ ...prev, benefits: newBenefits }))
                      }}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }))
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add benefit
                </button>
              </div>
            </div>

            {/* Responsibilities - optional */}
            <div>
              <label className="block text-sm font-medium mb-2">Responsibilities (optional)</label>
              <div className="space-y-2">
                {formData.responsibilities.map((responsibility, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={responsibility}
                      onChange={(e) => {
                        const newResponsibilities = [...formData.responsibilities]
                        newResponsibilities[index] = e.target.value
                        setFormData((prev) => ({ ...prev, responsibilities: newResponsibilities }))
                      }}
                      className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Develop and maintain web applications"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newResponsibilities = formData.responsibilities.filter((_, i) => i !== index)
                        setFormData((prev) => ({ ...prev, responsibilities: newResponsibilities }))
                      }}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, responsibilities: [...prev.responsibilities, ""] }))
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add responsibility
                </button>
              </div>
            </div>

            {/* Essential Skills - optional */}
            <div>
              <label className="block text-sm font-medium mb-2">Essential skills (optional)</label>
              <div className="space-y-2">
                {formData.essentialSkills.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => {
                        const newSkills = [...formData.essentialSkills]
                        newSkills[index] = e.target.value
                        setFormData((prev) => ({ ...prev, essentialSkills: newSkills }))
                      }}
                      className="flex-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. JavaScript, React, Node.js"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newSkills = formData.essentialSkills.filter((_, i) => i !== index)
                        setFormData((prev) => ({ ...prev, essentialSkills: newSkills }))
                      }}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, essentialSkills: [...prev.essentialSkills, ""] }))
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add skill
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const JobPreview = () => (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      onClick={() => setShowPreview(false)}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Job Preview</h2>
          <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            {companyProfile.logo_url && (
              <img
                src={companyProfile.logo_url || "/placeholder.svg"}
                alt="Company logo"
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{formData.title || "Job Title"}</h1>
              <p className="text-lg text-gray-600">{companyProfile.company_name}</p>
              <p className="text-gray-500">{formData.locationText || "Location"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Salary</p>
              <p className="font-medium">
                £{formData.salaryMin || "0"} - £{formData.salaryMax || "0"} {formData.salaryFrequency.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Job Type</p>
              <p className="font-medium">{formData.jobTypes.join(", ") || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hiring Timeline</p>
              <p className="font-medium">
                {recruitmentOptions.find((o) => o.value === formData.recruitmentTimeline)?.label ||
                  "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Positions Available</p>
              <p className="font-medium">{formData.hiringCount}</p>
            </div>
          </div>

          {formData.recruitmentTimeline && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="space-y-2">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Posting Plan:</strong>{" "}
                  {recruitmentOptions.find((o) => o.value === formData.recruitmentTimeline)?.label} -{" "}
                  {recruitmentOptions.find((o) => o.value === formData.recruitmentTimeline)?.displayPrice}
                </p>

              </div>
            </div>
          )}


          <div className="grid grid-cols-1 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Experience Level</h3>
              <p className="text-gray-600">
                {EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === formData.experienceLevel)?.label || "Not specified"}
              </p>
            </div>

            {formData.benefits.filter(b => b.trim() !== "").length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Benefits</h3>
                <ul className="text-gray-600 space-y-1">
                  {formData.benefits.filter(b => b.trim() !== "").map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formData.responsibilities.filter(r => r.trim() !== "").length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Responsibilities</h3>
                <ul className="text-gray-600 space-y-1">
                  {formData.responsibilities.filter(r => r.trim() !== "").map((responsibility, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formData.essentialSkills.filter(s => s.trim() !== "").length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Essential Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.essentialSkills.filter(s => s.trim() !== "").map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div>
            <h3 className="font-semibold mb-2">Job Description</h3>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{formData.description || "No description provided yet."}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700">
              Apply now
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
              Save for later
            </button>
          </div>
        </div>
      </div>
    </div>
  )

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
                {companyProfile.logo_url && (
                  <img
                    src={companyProfile.logo_url || "/placeholder.svg"}
                    alt="Company logo"
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold">Post a job</h2>
                  <p className="text-sm text-gray-500">Step {currentStep} of 5</p>
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
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {renderStep()}
              {err && <div className="mt-4 text-red-600 text-sm">{err}</div>}
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

              {currentStep < 5 ? (
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
                  {loading ? "Publishing..." : formData.price === 0 ? "Publish Job (Free)" : "Continue to Payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPreview && <JobPreview />}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          jobData={formData}
          companyProfile={companyProfile}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </>
  )
}
