"use client"

import { useState } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import MapLocationPicker from "./map-location-picker"
import { X, ArrowLeft, ArrowRight, Briefcase, Plus, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

type Props = {
  companyProfile: any
}

type VacancyFormData = {
  // Step 1: Active duration (subscription-based, no pricing)
  activeDuration: string
  // Step 2: Job basics
  title: string
  description: string
  // Step 3: Job details
  jobType: "full-time" | "part-time" | "remote" | "contract" | "freelance" | "internship" | ""
  experienceLevels: string[] // Changed to array to support multiple levels
  noExperienceRequired: boolean // Training provided checkbox
  responsibilities: string[] // What the person will be doing
  requirements: string[] // Qualifications, certifications, driving license, etc.
  skills: string[]
  languages: string[]
  benefits: string[]
  // Step 4: Salary (optional)
  salaryMin: string
  salaryMax: string
  salaryPeriod: "hourly" | "daily" | "yearly"
  // Step 5: Location
  fullAddress: string
  locationCoords: { lat: number; lon: number } | null
  city: string
  country: string
}

const ACTIVE_DURATION_OPTIONS = [
  { value: "3_days", label: "3 days" },
  { value: "7_days", label: "7 days" },
  { value: "2_weeks", label: "2 weeks" },
  { value: "3_weeks", label: "3 weeks" },
  { value: "4_weeks", label: "4 weeks" },
]

const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time", description: "Permanent, full-time position" },
  { value: "part-time", label: "Part-time", description: "Part-time hours" },
  { value: "remote", label: "Remote", description: "Work from anywhere" },
  { value: "contract", label: "Contract", description: "Fixed-term contract" },
  { value: "freelance", label: "Freelance", description: "Project-based work" },
  { value: "internship", label: "Internship", description: "Learning opportunity" },
]

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "entry", label: "Entry Level", description: "0-2 years experience" },
  { value: "mid", label: "Mid Level", description: "2-5 years experience" },
  { value: "senior", label: "Senior", description: "5-10 years experience" },
  { value: "lead", label: "Lead", description: "10+ years, leadership role" },
  { value: "executive", label: "Executive", description: "C-level, executive position" },
]

const COMMON_SKILLS = [
  "Communication", "Leadership", "Problem Solving", "Teamwork",
  "Project Management", "Agile", "Time Management", "Customer Service"
]

const COMMON_LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Chinese", "Japanese", "Arabic", "Russian", "Hindi", "Polish"
]

const COMMON_BENEFITS = [
  "Health Insurance", "Dental Insurance", "Vision Insurance", "401(k)",
  "Paid Time Off", "Remote Work", "Flexible Hours", "Professional Development",
  "Gym Membership", "Free Lunch", "Stock Options", "Bonus", "Pension"
]

const COMMON_RESPONSIBILITIES = [
  "Client Communication", "Project Management", "Team Collaboration",
  "Report Writing", "Data Analysis", "Quality Assurance",
  "Training & Mentoring", "Budget Management", "Strategic Planning"
]

const COMMON_REQUIREMENTS = [
  "Driving License (Full UK)", "DBS Check", "Right to Work in UK",
  "Professional Certification", "Degree Required", "Own Tools/Equipment",
  "Own Vehicle", "First Aid Certified", "CRB Check", "Public Liability Insurance"
]

export default function VacancyPostingForm({ companyProfile }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Tag input states
  const [skillInput, setSkillInput] = useState("")
  const [languageInput, setLanguageInput] = useState("")
  const [benefitInput, setBenefitInput] = useState("")
  const [responsibilityInput, setResponsibilityInput] = useState("")
  const [requirementInput, setRequirementInput] = useState("")

  const [formData, setFormData] = useState<VacancyFormData>({
    activeDuration: "",
    title: "",
    description: "",
    jobType: "",
    experienceLevels: [],
    noExperienceRequired: false,
    responsibilities: [],
    requirements: [],
    skills: [],
    languages: [],
    benefits: [],
    salaryMin: "",
    salaryMax: "",
    salaryPeriod: "yearly",
    fullAddress: "",
    locationCoords: null,
    city: "",
    country: "",
  })

  const closeModal = () => {
    setOpen(false)
    router.push("/dashboard/company")
  }

  const handleMapLocationSelect = (location: { latitude: number; longitude: number; address: string } | null) => {
    if (location) {
      // Extract city and country from address (simple extraction)
      const parts = location.address.split(',').map(p => p.trim())
      const city = parts.length > 0 ? parts[0] : ""
      const country = parts.length > 1 ? parts[parts.length - 1] : ""

      setFormData((prev) => ({
        ...prev,
        fullAddress: location.address,
        locationCoords: { lat: location.latitude, lon: location.longitude },
        city,
        country,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        fullAddress: "",
        locationCoords: null,
        city: "",
        country: "",
      }))
    }
  }

  const toggleExperienceLevel = (level: string) => {
    setFormData((prev) => ({
      ...prev,
      experienceLevels: prev.experienceLevels.includes(level)
        ? prev.experienceLevels.filter(l => l !== level)
        : [...prev.experienceLevels, level]
    }))
  }

  const removeExperienceLevel = (level: string) => {
    setFormData((prev) => ({
      ...prev,
      experienceLevels: prev.experienceLevels.filter(l => l !== level)
    }))
  }

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }))
    }
    setSkillInput("")
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
  }

  const addLanguage = (language: string) => {
    const trimmed = language.trim()
    if (trimmed && !formData.languages.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, languages: [...prev.languages, trimmed] }))
    }
    setLanguageInput("")
  }

  const removeLanguage = (language: string) => {
    setFormData((prev) => ({ ...prev, languages: prev.languages.filter(l => l !== language) }))
  }

  const addBenefit = (benefit: string) => {
    const trimmed = benefit.trim()
    if (trimmed && !formData.benefits.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, benefits: [...prev.benefits, trimmed] }))
    }
    setBenefitInput("")
  }

  const removeBenefit = (benefit: string) => {
    setFormData((prev) => ({ ...prev, benefits: prev.benefits.filter(b => b !== benefit) }))
  }

  const addResponsibility = (responsibility: string) => {
    const trimmed = responsibility.trim()
    if (trimmed && !formData.responsibilities.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, responsibilities: [...prev.responsibilities, trimmed] }))
    }
    setResponsibilityInput("")
  }

  const removeResponsibility = (responsibility: string) => {
    setFormData((prev) => ({ ...prev, responsibilities: prev.responsibilities.filter(r => r !== responsibility) }))
  }

  const addRequirement = (requirement: string) => {
    const trimmed = requirement.trim()
    if (trimmed && !formData.requirements.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, requirements: [...prev.requirements, trimmed] }))
    }
    setRequirementInput("")
  }

  const removeRequirement = (requirement: string) => {
    setFormData((prev) => ({ ...prev, requirements: prev.requirements.filter(r => r !== requirement) }))
  }

  const validateStep = (step: number): boolean => {
    setErr(null)

    switch (step) {
      case 1:
        if (!formData.activeDuration) {
          setErr("Please select how long you want your vacancy to be active.")
          return false
        }
        break
      case 2:
        if (!formData.title.trim()) {
          setErr("Please enter a job title.")
          return false
        }
        if (formData.title.length < 5) {
          setErr("Job title must be at least 5 characters.")
          return false
        }
        if (!formData.description.trim()) {
          setErr("Please enter a job description.")
          return false
        }
        if (formData.description.length < 50) {
          setErr("Job description must be at least 50 characters to provide sufficient detail.")
          return false
        }
        break
      case 3:
        if (!formData.jobType) {
          setErr("Please select a job type.")
          return false
        }
        if (formData.experienceLevels.length === 0) {
          setErr("Please select at least one experience level.")
          return false
        }
        break
      case 4:
        // Salary is optional, no validation needed
        break
      case 5:
        if (!formData.locationCoords) {
          setErr("Please select a location on the map. This is mandatory for job postings.")
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

      // Calculate expiration date
      const expirationDate = new Date()
      const planDays = {
        "3_days": 3,
        "7_days": 7,
        "2_weeks": 14,
        "3_weeks": 21,
        "4_weeks": 28,
      }
      const daysToAdd = planDays[formData.activeDuration as keyof typeof planDays] || 7
      expirationDate.setDate(expirationDate.getDate() + daysToAdd)

      // Map salary period to salary_frequency format (database constraint: per_hour, per_day, per_year)
      const salaryFrequencyMap: Record<string, string> = {
        hourly: "per_hour",
        daily: "per_day",
        yearly: "per_year"
      }

      const payload = {
        company_id: companyProfile.id,
        homeowner_id: null,
        title: formData.title.trim(),
        location: formData.fullAddress,
        latitude: formData.locationCoords?.lat || null,
        longitude: formData.locationCoords?.lon || null,
        city: formData.city || null,
        country: formData.country || null,
        formatted_address: formData.fullAddress,
        work_location: formData.jobType === "remote" ? "remote" : "onsite",
        description: formData.description.trim(),
        short_description: formData.description.trim().substring(0, 200),
        job_type: formData.jobType,
        experience_level: formData.experienceLevels.length > 0 ? formData.experienceLevels[0] : null,
        no_experience_required: formData.noExperienceRequired,
        is_tradespeople_job: false,
        salary_min: formData.salaryMin ? Number.parseInt(formData.salaryMin) : null,
        salary_max: formData.salaryMax ? Number.parseInt(formData.salaryMax) : null,
        salary_period: formData.salaryPeriod,
        salary_frequency: salaryFrequencyMap[formData.salaryPeriod] || null,
        responsibilities: formData.responsibilities.length > 0 ? formData.responsibilities : null,
        requirements: formData.requirements.length > 0 ? formData.requirements : null,
        skills_required: formData.skills.length > 0 ? formData.skills : null,
        languages: formData.languages.length > 0 ? formData.languages : null,
        benefits: formData.benefits.length > 0 ? formData.benefits : null,
        is_active: true,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString(),
      }

      console.log("[Vacancy Form] Submitting vacancy:", payload)

      const { data, error } = await supabase.from("jobs").insert(payload).select().limit(1).single()

      if (error) {
        console.error("Insert vacancy error:", error)
        setErr(error.message)
        setLoading(false)
        return
      }

      // Increment job usage counter
      const { error: incrementError } = await supabase.rpc("increment_subscription_usage", {
        user_id_param: user.id,
        usage_type: "job"
      })

      if (incrementError) {
        console.error("Error incrementing subscription usage:", incrementError)
        // Don't fail the whole operation, job is already posted
        // Just log the error
      }

      // Show success toast and redirect
      toast({
        title: "✓ Vacancy Posted Successfully",
        description: `Your vacancy is now live and will be active until ${expirationDate.toLocaleDateString()}.`,
        duration: 5000,
      })

      // Reset loading before redirect
      setLoading(false)

      setTimeout(() => {
        router.push("/dashboard/company")
        router.refresh()
      }, 1000)
    } catch (err: any) {
      console.error("Unexpected error during vacancy submission:", err)
      setErr(err?.message || "Unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">How long do you want your vacancy to be active?</h3>
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

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Job Title & Description</h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Senior Software Engineer, Marketing Manager"
                className="w-full shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Be specific and descriptive</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full h-48 border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe the role, responsibilities, requirements, and what makes this opportunity great..."
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length} characters (minimum 50)</p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Job Details</h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                Job Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {JOB_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 shadow-sm hover:shadow-md ${
                      formData.jobType === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="jobType"
                      value={option.value}
                      checked={formData.jobType === option.value}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          jobType: e.target.value as any,
                        }))
                      }}
                      className="sr-only"
                    />
                    <span className="font-semibold text-sm">{option.label}</span>
                    <span className="text-xs text-gray-600 mt-1">{option.description}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Experience Level <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">(Select one or more)</span>
              </label>
              <div className="space-y-2">
                {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300 shadow-sm hover:shadow-md ${
                      formData.experienceLevels.includes(option.value)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExperienceLevel(option.value)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={formData.experienceLevels.includes(option.value)}
                        onChange={() => {}}
                        className="w-5 h-5 text-blue-600 rounded border-2 border-gray-400 focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                      <div>
                        <span className="font-medium">{option.label}</span>
                        <span className="text-sm text-gray-600 ml-2">— {option.description}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {formData.experienceLevels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-sm font-medium">Selected:</span>
                  {formData.experienceLevels.map((level) => {
                    const option = EXPERIENCE_LEVEL_OPTIONS.find(o => o.value === level)
                    return (
                      <Badge key={level} variant="default" className="gap-1">
                        {option?.label}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeExperienceLevel(level)
                          }}
                        />
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-green-300 shadow-sm hover:shadow-md bg-green-50 dark:bg-green-900/20 border-green-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.noExperienceRequired}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        noExperienceRequired: e.target.checked,
                      }))
                    }
                    className="w-5 h-5 text-green-600 rounded border-2 border-gray-400 focus:ring-2 focus:ring-green-500 shadow-sm"
                  />
                  <div>
                    <span className="font-medium text-green-800">No experience required (Training provided)</span>
                    <p className="text-sm text-green-600">Perfect for entry-level candidates and career changers</p>
                  </div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Key Responsibilities (Optional)
                <span className="text-xs text-gray-500 ml-2">What will the person be doing?</span>
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={responsibilityInput}
                    onChange={(e) => setResponsibilityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addResponsibility(responsibilityInput)
                      }
                    }}
                    placeholder="e.g., Managing client relationships"
                    className="flex-1 shadow-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => addResponsibility(responsibilityInput)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_RESPONSIBILITIES.map((responsibility) => (
                    <Badge
                      key={responsibility}
                      variant={formData.responsibilities.includes(responsibility) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => formData.responsibilities.includes(responsibility) ? removeResponsibility(responsibility) : addResponsibility(responsibility)}
                    >
                      {responsibility}
                    </Badge>
                  ))}
                </div>
                {formData.responsibilities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-sm font-medium">Selected:</span>
                    {formData.responsibilities.map((responsibility) => (
                      <Badge key={responsibility} variant="default" className="gap-1">
                        {responsibility}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeResponsibility(responsibility)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Requirements (Optional)
                <span className="text-xs text-gray-500 ml-2">Driving license, certifications, qualifications, etc.</span>
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={requirementInput}
                    onChange={(e) => setRequirementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addRequirement(requirementInput)
                      }
                    }}
                    placeholder="e.g., Full UK Driving License"
                    className="flex-1 shadow-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => addRequirement(requirementInput)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_REQUIREMENTS.map((requirement) => (
                    <Badge
                      key={requirement}
                      variant={formData.requirements.includes(requirement) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => formData.requirements.includes(requirement) ? removeRequirement(requirement) : addRequirement(requirement)}
                    >
                      {requirement}
                    </Badge>
                  ))}
                </div>
                {formData.requirements.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-sm font-medium">Selected:</span>
                    {formData.requirements.map((requirement) => (
                      <Badge key={requirement} variant="default" className="gap-1">
                        {requirement}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeRequirement(requirement)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Required Skills (Optional)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill(skillInput)
                      }
                    }}
                    placeholder="Type a skill and press Enter"
                    className="flex-1 shadow-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => addSkill(skillInput)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.map((skill) => (
                    <Badge
                      key={skill}
                      variant={formData.skills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => formData.skills.includes(skill) ? removeSkill(skill) : addSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-sm font-medium">Selected:</span>
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="default" className="gap-1">
                        {skill}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Languages (Optional)
                <span className="text-xs text-gray-500 ml-2">Required or preferred languages</span>
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLanguage(languageInput)
                      }
                    }}
                    placeholder="e.g., English"
                    className="flex-1 shadow-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => addLanguage(languageInput)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_LANGUAGES.map((language) => (
                    <Badge
                      key={language}
                      variant={formData.languages.includes(language) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => formData.languages.includes(language) ? removeLanguage(language) : addLanguage(language)}
                    >
                      {language}
                    </Badge>
                  ))}
                </div>
                {formData.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-sm font-medium">Selected:</span>
                    {formData.languages.map((language) => (
                      <Badge key={language} variant="default" className="gap-1">
                        {language}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeLanguage(language)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Benefits (Optional)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addBenefit(benefitInput)
                      }
                    }}
                    placeholder="Type a benefit and press Enter"
                    className="flex-1 shadow-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => addBenefit(benefitInput)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_BENEFITS.map((benefit) => (
                    <Badge
                      key={benefit}
                      variant={formData.benefits.includes(benefit) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => formData.benefits.includes(benefit) ? removeBenefit(benefit) : addBenefit(benefit)}
                    >
                      {benefit}
                    </Badge>
                  ))}
                </div>
                {formData.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-sm font-medium">Selected:</span>
                    {formData.benefits.map((benefit) => (
                      <Badge key={benefit} variant="default" className="gap-1">
                        {benefit}
                        <XIcon
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeBenefit(benefit)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Salary Information (Optional)</h3>
            <p className="text-sm text-gray-600">Adding salary information helps attract qualified candidates</p>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minimum £</label>
                <Input
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salaryMin: e.target.value }))}
                  placeholder="0"
                  className="shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Maximum £</label>
                <Input
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salaryMax: e.target.value }))}
                  placeholder="0"
                  className="shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Period</label>
                <select
                  value={formData.salaryPeriod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salaryPeriod: e.target.value as any }))}
                  className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hourly">Per hour</option>
                  <option value="daily">Per day</option>
                  <option value="yearly">Per year</option>
                </select>
              </div>
            </div>

            {formData.salaryMin && formData.salaryMax && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Salary range: £{Number(formData.salaryMin).toLocaleString()} - £{Number(formData.salaryMax).toLocaleString()} {formData.salaryPeriod === "yearly" ? "per year" : formData.salaryPeriod === "daily" ? "per day" : "per hour"}
                </p>
              </div>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Job Location</h3>
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> Select where the job is located. For remote jobs, you can set your company's location.
            </p>

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
                placeholder="Click on the map to select the job location (mandatory)"
              />
              {formData.locationCoords && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">✓ Location selected</p>
                  <p className="text-sm text-green-700">{formData.fullAddress}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Coordinates: {formData.locationCoords.lat.toFixed(4)}, {formData.locationCoords.lon.toFixed(4)}
                  </p>
                </div>
              )}
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
            className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-4">
                {companyProfile?.logo_url && (
                  <img
                    src={companyProfile.logo_url}
                    alt="Company logo"
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Post a Vacancy
                  </h2>
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
                  {loading ? "Publishing..." : "Publish Vacancy"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
