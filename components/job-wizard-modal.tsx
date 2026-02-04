"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import MapLocationPicker from "./map-location-picker"
import { X, ArrowLeft, ArrowRight, Eye, Briefcase, Hammer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/context"

type Props = {
  companyProfile: any
  userType: "company" | "homeowner"
  redirectPath?: string // Optional redirect path after successful job posting
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
  languages: string[]
  // Step 4: Location
  fullAddress: string
  locationCoords: { lat: number; lon: number } | null
}

const getActiveDurationOptions = (isPtBR: boolean) => [
  { value: "3_days", label: isPtBR ? "3 dias" : "3 days" },
  { value: "7_days", label: isPtBR ? "7 dias" : "7 days" },
  { value: "2_weeks", label: isPtBR ? "2 semanas" : "2 weeks" },
  { value: "3_weeks", label: isPtBR ? "3 semanas" : "3 weeks" },
  { value: "4_weeks", label: isPtBR ? "4 semanas" : "4 weeks" },
]

const getPayFrequencyOptions = (isPtBR: boolean) => [
  { value: "per_hour", label: isPtBR ? "por hora" : "per hour" },
  { value: "per_day", label: isPtBR ? "por dia" : "per day" },
  { value: "per_week", label: isPtBR ? "por semana" : "per week" },
  { value: "per_month", label: isPtBR ? "por mês" : "per month" },
  { value: "per_year", label: isPtBR ? "por ano" : "per year" },
  { value: "per_job", label: isPtBR ? "por trabalho" : "per job" },
]

// Comprehensive list of professions based on popular categories
const getCommonProfessions = (isPtBR: boolean) => {
  if (isPtBR) {
    return [
      // Tech & TI
      "Desenvolvedor",
      "Engenheiro de Software",
      "Web Designer",
      "Designer",
      "Especialista em IA",
      "Suporte de TI",
      "Analista de Dados",
      "Cibersegurança",
      "Especialista em Cibersegurança",
      "DevOps",
      "Engenheiro DevOps",
      // Saúde
      "Enfermeiro",
      "Cuidador",
      "Médico",
      "Farmacêutico",
      "Dentista",
      // Serviços Profissionais
      "Administrador",
      "Contador",
      "Marketing",
      "Gerente de Marketing",
      "Vendas",
      "Representante de Vendas",
      "Gerente de RH",
      "Advogado",
      "Professor",
      "Recrutador",
      "Consultor",
      "Arquiteto",
      "Gerente de Projetos",
      "Atendimento ao Cliente",
      // Outros Serviços
      "Chef",
      "Motorista",
      "Armazém",
      "Operador de Armazém",
      "Segurança",
      "Guarda de Segurança",
      "Fotógrafo",
      "Barbeiro",
      "Personal Trainer",
      "Planejador de Eventos",
    ]
  }

  return [
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
}

// Comprehensive list of trades based on popular categories
const getCommonTrades = (isPtBR: boolean) => {
  if (isPtBR) {
    return [
      // Ofícios
      "Encanador",
      "Eletricista",
      "Construtor",
      "Carpinteiro",
      "Pintor",
      "Pintor & Decorador",
      "Telhador",
      "Jardineiro",
      "Faxineiro",
      "Faz-Tudo",
      "Faz-Tudo Geral",
      "Chaveiro",
      "Banheiros",
      "Instalador de Banheiros",
      "Azulejista",
      "Aquecimento",
      "Engenheiro de Aquecimento",
      "Caldeira a Gás",
      "Engenheiro de Gás",
      "Gesseiro",
      "Calçadas",
      "Especialista em Calçadas",
      "Cercas",
      "Cirurgião de Árvores",
      "Janelas/Portas",
      "Instalador de Janelas",
      "Instalador de Portas",
      "Mecânico",
      "Pisos",
      "Especialista em Pisos",
      "Instalador de Cozinhas",
      "HVAC",
      "Engenheiro HVAC",
      "Vidraceiro",
      "Decorador",
      "Pedreiro",
      "Andaimeiro",
      "Soldador",
    ]
  }

  return [
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
}

// Language data with flags
const LANGUAGE_FLAGS: { [key: string]: { flag: string; en: string; ptBR: string } } = {
  english: { flag: "🇬🇧", en: "English", ptBR: "Inglês" },
  spanish: { flag: "🇪🇸", en: "Spanish", ptBR: "Espanhol" },
  mandarin: { flag: "🇨🇳", en: "Mandarin", ptBR: "Mandarim" },
  french: { flag: "🇫🇷", en: "French", ptBR: "Francês" },
  german: { flag: "🇩🇪", en: "German", ptBR: "Alemão" },
  italian: { flag: "🇮🇹", en: "Italian", ptBR: "Italiano" },
  portuguese: { flag: "🇵🇹", en: "Portuguese", ptBR: "Português" },
  russian: { flag: "🇷🇺", en: "Russian", ptBR: "Russo" },
  arabic: { flag: "🇸🇦", en: "Arabic", ptBR: "Árabe" },
  polish: { flag: "🇵🇱", en: "Polish", ptBR: "Polonês" },
  turkish: { flag: "🇹🇷", en: "Turkish", ptBR: "Turco" },
  urdu: { flag: "🇵🇰", en: "Urdu", ptBR: "Urdu" },
  bengali: { flag: "🇧🇩", en: "Bengali", ptBR: "Bengali" },
  punjabi: { flag: "🇮🇳", en: "Punjabi", ptBR: "Punjabi" },
  romanian: { flag: "🇷🇴", en: "Romanian", ptBR: "Romeno" },
  hindi: { flag: "🇮🇳", en: "Hindi", ptBR: "Hindi" },
  ukrainian: { flag: "🇺🇦", en: "Ukrainian", ptBR: "Ucraniano" },
  dutch: { flag: "🇳🇱", en: "Dutch", ptBR: "Holandês" },
}

// Common languages for trade jobs - returns array of { key, flag, name }
const getCommonLanguages = (isPtBR: boolean) => {
  const keys = [
    "english", "spanish", "mandarin", "french", "german",
    "italian", "portuguese", "russian", "arabic", "polish",
    "turkish", "urdu", "bengali", "punjabi", "romanian"
  ]

  return keys.map(key => ({
    key,
    flag: LANGUAGE_FLAGS[key].flag,
    name: isPtBR ? LANGUAGE_FLAGS[key].ptBR : LANGUAGE_FLAGS[key].en
  }))
}

export default function JobWizardModal({ companyProfile, userType, redirectPath }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const { locale } = useTranslation()

  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [locationChoice, setLocationChoice] = useState<"myLocation" | "differentLocation" | null>(null)

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [languageInput, setLanguageInput] = useState("")

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
    languages: [],
    fullAddress: "",
    locationCoords: null,
  })

  const closeModal = () => {
    setOpen(false)
    const defaultRedirect = userType === "company" ? "/dashboard/company" : "/dashboard/homeowner"
    router.push(redirectPath || defaultRedirect)
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

  // Helper functions for managing languages
  const addLanguage = (language: string) => {
    const trimmed = language.trim()
    if (trimmed && !formData.languages.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        languages: [...prev.languages, trimmed],
      }))
      setLanguageInput("")
    }
  }

  const removeLanguage = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter((lang) => lang !== language),
    }))
  }

  const toggleLanguage = (language: string) => {
    if (formData.languages.includes(language)) {
      removeLanguage(language)
    } else {
      addLanguage(language)
    }
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
        const hasProfileLocation = companyProfile?.latitude && companyProfile?.longitude

        // If user has profile location but hasn't made a choice yet
        if (hasProfileLocation && !locationChoice) {
          setErr("Please choose whether this job is at your location or a different location.")
          return false
        }

        // Ensure location coordinates are set
        if (!formData.locationCoords) {
          setErr("Please select a location. This is mandatory.")
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
    console.log("[JOB-WIZARD] Starting job submission...")

    // Timeout protection - automatically reset loading after 30 seconds
    const timeoutId = setTimeout(() => {
      console.error("[JOB-WIZARD] Submission timeout after 30 seconds")
      setLoading(false)
      setErr("Request timed out. Please check your connection and try again.")
    }, 30000)

    try {
      // Check subscription limits
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        clearTimeout(timeoutId)
        setErr("Authentication required.")
        setLoading(false)
        return
      }

      const { data: canPost, error: checkError } = await supabase
        .rpc("can_user_post_job", { user_id_param: user.id })

      if (checkError) {
        clearTimeout(timeoutId)
        console.error("[JOB-WIZARD] Error checking job posting permission:", checkError)
        setErr("Failed to verify posting permissions.")
        setLoading(false)
        return
      }

      if (!canPost.can_post) {
        clearTimeout(timeoutId)
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
        languages: formData.languages.length > 0 ? formData.languages : null,
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
        clearTimeout(timeoutId)
        console.error("[JOB-WIZARD] Insert job error:", error)
        console.error("[JOB-WIZARD] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setErr(`Failed to post job: ${error.message}`)
        setLoading(false)
        return
      }

      console.log("[JOB-WIZARD] Job posted successfully:", data)
      clearTimeout(timeoutId)

      // Send trade job notifications to matching companies
      if (formData.postingType === "tradespeople" && data && formData.locationCoords) {
        try {
          // Get poster name based on user type
          const posterName = userType === "homeowner"
            ? `${companyProfile.first_name || ''} ${companyProfile.last_name || ''}`.trim() || "A homeowner"
            : companyProfile.company_name || "A company"

          console.log("[JOB-WIZARD] Sending trade job notifications...")
          const notifResponse = await fetch("/api/notifications/send-trade-job-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobId: data.id,
              jobTitle: formData.profession.trim(),
              jobLat: formData.locationCoords.lat,
              jobLon: formData.locationCoords.lon,
              jobSkills: [formData.profession.trim()], // Use profession as a skill for matching
              posterName,
            }),
          })

          const notifResult = await notifResponse.json()
          console.log("[JOB-WIZARD] Trade job notification result:", notifResult)
        } catch (notifError) {
          // Don't fail the job posting if notifications fail
          console.error("[JOB-WIZARD] Failed to send trade job notifications:", notifError)
        }
      }

      // Show success toast notification
      toast({
        title: "✅ Job Posted Successfully!",
        description: `Your job will be active until ${expirationDate.toLocaleDateString()}`,
        variant: "default",
      })

      // Reset loading state before redirect
      setLoading(false)

      // Redirect to dashboard with error handling
      const defaultRedirect = userType === "company" ? "/dashboard/company" : "/dashboard/homeowner"
      const redirectUrl = redirectPath || defaultRedirect

      console.log("[JOB-WIZARD] Redirecting to:", redirectUrl)

      setTimeout(() => {
        try {
          router.push(redirectUrl)
        } catch (pushError) {
          console.error("[JOB-WIZARD] Router push failed:", pushError)
          // Fallback to direct navigation
          window.location.href = redirectUrl
        }
      }, 1000)
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error("[JOB-WIZARD] Unexpected error:", err)
      setErr(err?.message || "An unexpected error occurred. Please try again.")
      setLoading(false)
    } finally {
      // Ensure timeout is always cleared
      clearTimeout(timeoutId)
      // Always reset loading state, regardless of success or failure
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
              {getActiveDurationOptions(locale === 'pt-BR').map((option) => (
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
        const isPtBR = locale === 'pt-BR'
        const professionsList = formData.postingType === "tradespeople" ? getCommonTrades(isPtBR) : getCommonProfessions(isPtBR)

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

              {/* Quick select buttons for tradespeople - most common trades */}
              {formData.postingType === "tradespeople" && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Quick select (recommended for better matching):</p>
                  <div className="flex flex-wrap gap-2">
                    {professionsList.slice(0, 12).map((trade) => {
                      const isSelected = formData.profession === trade
                      return (
                        <button
                          key={trade}
                          type="button"
                          onClick={() => handleSuggestionClick(trade)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white ring-2 ring-blue-300 shadow-md"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {trade}
                          {isSelected && <span className="text-xs ml-1">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

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
                placeholder={formData.postingType === "tradespeople" ? "Or type a trade (e.g., Plumber, Electrician)" : "Type a profession (e.g., Software Engineer, Designer)"}
                className={`w-full border rounded-lg p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formData.postingType === "tradespeople" && formData.profession && professionsList.includes(formData.profession)
                    ? "border-green-500 bg-green-50"
                    : ""
                }`}
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
                {formData.postingType === "tradespeople"
                  ? "Selecting from suggestions helps match with relevant tradespeople"
                  : "Start typing to see suggestions, or enter your own"}
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
                    {getPayFrequencyOptions(isPtBR)
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
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {/* Hidden file inputs */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="job-photo-gallery"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="job-photo-camera"
                      />

                      <div className="flex flex-col items-center mb-4">
                        <svg
                          className="w-10 h-10 text-gray-400 mb-2"
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
                        <span className="text-xs text-gray-500">Max 5MB, JPG/PNG</span>
                      </div>

                      {/* Two buttons: Gallery and Camera */}
                      <div className="flex gap-3 justify-center">
                        <label
                          htmlFor="job-photo-gallery"
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors text-sm font-medium"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Gallery
                        </label>
                        <label
                          htmlFor="job-photo-camera"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors text-sm font-medium"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Take Photo
                        </label>
                      </div>
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

              {/* Languages - Optional for all job types */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  Languages (optional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Specify any language requirements for this position
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addLanguage(languageInput)
                      }
                    }}
                    className="flex-1 border rounded-lg p-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type a language and press Enter"
                  />
                  <button
                    type="button"
                    onClick={() => addLanguage(languageInput)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {getCommonLanguages(isPtBR).map((langData) => {
                    const isSelected = formData.languages.includes(langData.name)
                    return (
                      <button
                        key={langData.key}
                        type="button"
                        onClick={() => toggleLanguage(langData.name)}
                        title={`${langData.name} - ${isSelected ? 'Click to remove' : 'Click to add'}`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white ring-2 ring-blue-300 shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <span className="text-lg">{langData.flag}</span>
                        <span className="hidden sm:inline">{langData.name}</span>
                        {isSelected && <span className="text-xs ml-0.5">✓</span>}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Click to select, click again to remove
                </p>
                {formData.languages.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-800 mb-2">Selected ({formData.languages.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm cursor-pointer hover:bg-blue-700 transition-colors"
                          onClick={() => removeLanguage(lang)}
                          title="Click to remove"
                        >
                          {lang}
                          <X className="w-3 h-3" />
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 4:
        const hasProfileLocation = companyProfile?.latitude && companyProfile?.longitude

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location</h3>
            <p className="text-sm text-gray-600">
              <span className="text-red-500">*</span> You must select a location. This is mandatory.
            </p>

            {/* Location Choice Radio Buttons */}
            {hasProfileLocation && (
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium mb-2">Is this job at your location?</label>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      locationChoice === "myLocation"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="locationChoice"
                      checked={locationChoice === "myLocation"}
                      onChange={() => {
                        setLocationChoice("myLocation")
                        // Auto-populate from profile
                        if (companyProfile?.latitude && companyProfile?.longitude) {
                          setFormData((prev) => ({
                            ...prev,
                            locationCoords: {
                              lat: companyProfile.latitude,
                              lon: companyProfile.longitude
                            },
                            fullAddress: companyProfile.location || ""
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="font-medium">Yes, at my location</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      locationChoice === "differentLocation"
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-200 hover:border-orange-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="locationChoice"
                      checked={locationChoice === "differentLocation"}
                      onChange={() => {
                        setLocationChoice("differentLocation")
                        // Clear location so user must select on map
                        setFormData((prev) => ({
                          ...prev,
                          locationCoords: null,
                          fullAddress: ""
                        }))
                      }}
                      className="mr-2"
                    />
                    <span className="font-medium">No, different location</span>
                  </label>
                </div>
              </div>
            )}

            {/* Show location confirmation if "myLocation" selected */}
            {locationChoice === "myLocation" && hasProfileLocation && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium mb-1">✓ Using your business location:</p>
                <p className="text-sm text-green-700">{companyProfile.location || "Location set from your profile"}</p>
                <p className="text-xs text-green-600 mt-1">
                  Coordinates: {companyProfile.latitude.toFixed(4)}, {companyProfile.longitude.toFixed(4)}
                </p>
              </div>
            )}

            {/* Show map picker if "differentLocation" selected OR no profile location */}
            {(locationChoice === "differentLocation" || !hasProfileLocation) && (
              <>
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
              </>
            )}

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
