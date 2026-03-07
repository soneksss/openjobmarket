"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import MapLocationPicker from "./map-location-picker"
import { X, ArrowLeft, ArrowRight, Eye, Briefcase, Hammer, Zap, Clock, Calendar, ChevronDown } from "lucide-react"
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
  // Step 2b: Urgency for tradespeople jobs
  urgencyType: "asap" | "today" | "flexible" | ""
  flexibleDays: number
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
  // Step 4: Send mode
  sendMode: "auto" | "manual" | null
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
const LANGUAGE_FLAGS: { [key: string]: { code: string; en: string; ptBR: string } } = {
  english:    { code: "gb", en: "English",    ptBR: "Inglês" },
  spanish:    { code: "es", en: "Spanish",    ptBR: "Espanhol" },
  mandarin:   { code: "cn", en: "Mandarin",   ptBR: "Mandarim" },
  french:     { code: "fr", en: "French",     ptBR: "Francês" },
  german:     { code: "de", en: "German",     ptBR: "Alemão" },
  italian:    { code: "it", en: "Italian",    ptBR: "Italiano" },
  portuguese: { code: "pt", en: "Portuguese", ptBR: "Português" },
  russian:    { code: "ru", en: "Russian",    ptBR: "Russo" },
  arabic:     { code: "sa", en: "Arabic",     ptBR: "Árabe" },
  polish:     { code: "pl", en: "Polish",     ptBR: "Polonês" },
  turkish:    { code: "tr", en: "Turkish",    ptBR: "Turco" },
  urdu:       { code: "pk", en: "Urdu",       ptBR: "Urdu" },
  bengali:    { code: "bd", en: "Bengali",    ptBR: "Bengali" },
  punjabi:    { code: "in", en: "Punjabi",    ptBR: "Punjabi" },
  romanian:   { code: "ro", en: "Romanian",   ptBR: "Romeno" },
  hindi:      { code: "in", en: "Hindi",      ptBR: "Hindi" },
  ukrainian:  { code: "ua", en: "Ukrainian",  ptBR: "Ucraniano" },
  dutch:      { code: "nl", en: "Dutch",      ptBR: "Holandês" },
  greek:      { code: "gr", en: "Greek",      ptBR: "Grego" },
  swedish:    { code: "se", en: "Swedish",    ptBR: "Sueco" },
  norwegian:  { code: "no", en: "Norwegian",  ptBR: "Norueguês" },
  danish:     { code: "dk", en: "Danish",     ptBR: "Dinamarquês" },
  finnish:    { code: "fi", en: "Finnish",    ptBR: "Finlandês" },
  czech:      { code: "cz", en: "Czech",      ptBR: "Tcheco" },
  hungarian:  { code: "hu", en: "Hungarian",  ptBR: "Húngaro" },
  slovak:     { code: "sk", en: "Slovak",     ptBR: "Eslovaco" },
  croatian:   { code: "hr", en: "Croatian",   ptBR: "Croata" },
  serbian:    { code: "rs", en: "Serbian",    ptBR: "Sérvio" },
  bulgarian:  { code: "bg", en: "Bulgarian",  ptBR: "Búlgaro" },
  hebrew:     { code: "il", en: "Hebrew",     ptBR: "Hebraico" },
  japanese:   { code: "jp", en: "Japanese",   ptBR: "Japonês" },
  korean:     { code: "kr", en: "Korean",     ptBR: "Coreano" },
  thai:       { code: "th", en: "Thai",       ptBR: "Tailandês" },
  vietnamese: { code: "vn", en: "Vietnamese", ptBR: "Vietnamita" },
  indonesian: { code: "id", en: "Indonesian", ptBR: "Indonésio" },
  malay:      { code: "my", en: "Malay",      ptBR: "Malaio" },
  somali:     { code: "so", en: "Somali",     ptBR: "Somali" },
  amharic:    { code: "et", en: "Amharic",    ptBR: "Amárico" },
  swahili:    { code: "ke", en: "Swahili",    ptBR: "Suaíli" },
  yoruba:     { code: "ng", en: "Yoruba",     ptBR: "Yoruba" },
  lithuanian: { code: "lt", en: "Lithuanian", ptBR: "Lituano" },
  latvian:    { code: "lv", en: "Latvian",    ptBR: "Letão" },
  estonian:   { code: "ee", en: "Estonian",   ptBR: "Estoniano" },
  albanian:   { code: "al", en: "Albanian",   ptBR: "Albanês" },
}

// Common languages for trade jobs - returns array of { key, code, name }
const getCommonLanguages = (isPtBR: boolean) => {
  const keys = [
    "english", "polish", "romanian", "punjabi", "urdu", "bengali",
    "spanish", "ukrainian", "russian", "japanese", "hindi",
    "french", "german", "italian", "portuguese", "arabic",
    "turkish", "mandarin"
  ]

  return keys.map(key => ({
    key,
    code: LANGUAGE_FLAGS[key].code,
    name: isPtBR ? LANGUAGE_FLAGS[key].ptBR : LANGUAGE_FLAGS[key].en
  }))
}

// All languages for autocomplete suggestions
const getAllLanguages = (isPtBR: boolean) =>
  Object.entries(LANGUAGE_FLAGS).map(([key, v]) => ({
    key,
    code: v.code,
    name: isPtBR ? v.ptBR : v.en,
  }))

export default function JobWizardModal({ companyProfile, userType, redirectPath }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const { locale } = useTranslation()

  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [vacancyEnabled, setVacancyEnabled] = useState(true)

  useEffect(() => {
    supabase.rpc("get_public_admin_settings").then(({ data }) => {
      if (data) setVacancyEnabled(data.vacancies_jobseekers_enabled ?? true)
    })
  }, [])

  // 3-step flow for all users: 1=details, 2=urgency, 3=location
  const isHomeowner = userType === "homeowner"
  const totalSteps = 3
  const [err, setErr] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [locationChoice, setLocationChoice] = useState<"myLocation" | "differentLocation" | null>(null)

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [languageInput, setLanguageInput] = useState("")
  const [langSuggestions, setLangSuggestions] = useState<Array<{ key: string; code: string; name: string }>>([])
  const [showLangSuggestions, setShowLangSuggestions] = useState(false)

  const [formData, setFormData] = useState<JobFormData>({
    activeDuration: "",
    postingType: "tradespeople",
    urgencyType: "",
    flexibleDays: 1,
    profession: "",
    shortDescription: "",
    longDescription: "",
    payMin: "",
    payMax: "",
    payFrequency: "per_job", // Default for tradespeople jobs
    trainingProvided: false,
    jobPhoto: null,
    jobPhotoUrl: null,
    languages: [],
    fullAddress: "",
    locationCoords: null,
    sendMode: "auto", // always auto — Fast dispatch logic
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
      case 1: // Job details
        if (!formData.profession.trim()) {
          setErr("Please enter the trade / service.")
          return false
        }
        if (!formData.shortDescription.trim()) {
          setErr("Please enter a short description.")
          return false
        }
        break
      case 2: // Urgency
        if (!formData.urgencyType) {
          setErr("Please select how urgently you need this job done.")
          return false
        }
        break
      case 3: // Location
        const hasProfileLocation = companyProfile?.latitude && companyProfile?.longitude
        if (hasProfileLocation && !locationChoice) {
          setErr("Please choose whether this job is at your location or a different location.")
          return false
        }
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
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setErr(null)
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return

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

      // Calculate expiration date based on job type and urgency
      const expirationDate = new Date()

      if (formData.postingType === "tradespeople") {
        // For tradespeople jobs, use urgency-based expiration
        switch (formData.urgencyType) {
          case "asap":
            // 1 hour from now
            expirationDate.setHours(expirationDate.getHours() + 1)
            break
          case "today":
            // 6 hours from now (middle of 3-6 hours range)
            expirationDate.setHours(expirationDate.getHours() + 6)
            break
          case "flexible":
            // 1-7 days based on user selection
            expirationDate.setDate(expirationDate.getDate() + formData.flexibleDays)
            break
          default:
            // Fallback to 1 day
            expirationDate.setDate(expirationDate.getDate() + 1)
        }
      } else {
        // For employee jobs, use standard duration (maximum 4 weeks = 28 days)
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
      }

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

      const fullDescription = formData.shortDescription

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
        // Flexible jobs use classic marketplace (no dispatch, no 15-min window, no reliability penalties)
        is_urgent: formData.postingType === "tradespeople" && formData.urgencyType !== "flexible",
        urgency_type: formData.postingType === "tradespeople" ? formData.urgencyType : null,
        deadline_at: formData.postingType === "tradespeople" ? expirationDate.toISOString() : null,
        // Uber-style job matching fields for trade jobs
        search_state: formData.postingType === "tradespeople" && (formData.urgencyType === "asap" || formData.urgencyType === "today") ? "active_search" : null,
        search_radius_miles: formData.postingType === "tradespeople" ? (formData.urgencyType === "asap" ? 5 : 10) : null,
        matching_status: formData.postingType === "tradespeople" ? "searching" : null,
        max_applications: formData.postingType === "tradespeople" ? 5 : null,
        max_responses: formData.urgencyType === "flexible" ? 10 : null,
        broadcast_radius: formData.postingType === "tradespeople" ? 5.0 : null,
        current_radius: formData.postingType === "tradespeople" ? 5.0 : null,
        max_radius: formData.postingType === "tradespeople" ? 50.0 : null,
        last_broadcast_at: formData.postingType === "tradespeople" ? new Date().toISOString() : null,
        homeowner_notified: false,
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
              urgencyType: formData.urgencyType, // Pass urgency type (ASAP jobs skip email notifications)
            }),
          })

          const notifResult = await notifResponse.json()
          console.log("[JOB-WIZARD] Trade job notification result:", notifResult)
        } catch (notifError) {
          // Don't fail the job posting if notifications fail
          console.error("[JOB-WIZARD] Failed to send trade job notifications:", notifError)
        }
      }

      // Dispatch ranked top-5 contractors for urgent jobs (always auto)
      const isUrgentAuto =
        formData.postingType === "tradespeople" &&
        (formData.urgencyType === "asap" || formData.urgencyType === "today") &&
        data

      if (isUrgentAuto) {
        // Fire-and-forget — don't block the redirect or show an error to the user
        fetch(`/api/jobs/${data.id}/dispatch-urgent`, { method: "POST" })
          .then((r) => r.json())
          .then((result) => {
            console.log("[JOB-WIZARD] Urgent dispatch result:", result)
          })
          .catch((err) => {
            console.error("[JOB-WIZARD] Urgent dispatch failed (non-fatal):", err)
          })
      }

      const redirectUrl = `/jobs/${data.id}/live`

      toast({
        title: "✅ Job Posted Successfully!",
        description: "Finding the best available trades near you…",
        variant: "default",
      })

      setLoading(false)

      console.log("[JOB-WIZARD] Redirecting to:", redirectUrl)

      setTimeout(() => {
        try {
          router.push(redirectUrl)
        } catch (pushError) {
          console.error("[JOB-WIZARD] Router push failed:", pushError)
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
      case 1: {
        const isPtBR = locale === 'pt-BR'
        const professionsList = getCommonTrades(isPtBR)

        const handleProfessionChange = (value: string) => {
          setFormData((prev) => ({ ...prev, profession: value }))
          if (value.trim().length > 0) {
            const filtered = professionsList.filter((p) =>
              p.toLowerCase().includes(value.toLowerCase())
            )
            setFilteredSuggestions(filtered)
            setShowSuggestions(true)
          } else {
            setFilteredSuggestions([])
            setShowSuggestions(false)
          }
        }

        const handleSuggestionClick = (suggestion: string) => {
          setFormData((prev) => ({ ...prev, profession: suggestion }))
          setShowSuggestions(false)
          setFilteredSuggestions([])
        }

        return (
          <div className="space-y-4">
            {/* Vacancy shortcut for company users */}
            {userType === "company" && vacancyEnabled && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push("/jobs/vacancy/new")}
                  className="text-sm text-slate-400 md:text-gray-500 hover:text-blue-500 hover:underline"
                >
                  Posting a long-term role? <span className="font-medium">Switch to Vacancy →</span>
                </button>
              </div>
            )}

            <h3 className="text-lg font-semibold text-white md:text-gray-900">Job / Task Details</h3>

            {/* Trade input */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">
                Trade / Service <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.profession}
                onChange={(e) => handleProfessionChange(e.target.value)}
                onFocus={() => {
                  if (formData.profession.trim().length === 0) {
                    setFilteredSuggestions(professionsList)
                    setShowSuggestions(true)
                  } else {
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g. Plumber, Electrician, Painter…"
                className={`w-full border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 md:focus:ring-blue-500 focus:border-transparent bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400 md:placeholder:text-gray-400 ${
                  formData.profession && professionsList.includes(formData.profession)
                    ? "border-emerald-500 bg-emerald-500/10 md:border-green-500 md:bg-green-50"
                    : ""
                }`}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 md:bg-white border border-slate-700 md:border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 hover:bg-slate-700 md:hover:bg-blue-50 cursor-pointer transition-colors text-slate-200 md:text-gray-900"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 md:text-gray-500 mt-1">
                Selecting from suggestions helps match with relevant tradespeople
              </p>

              {/* Quick-select chips */}
              <div className="mt-3">
                <p className="text-xs text-slate-400 md:text-gray-500 mb-2">Quick select:</p>
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
                            ? "bg-emerald-600 md:bg-blue-600 text-white ring-2 ring-emerald-300 md:ring-blue-300 shadow-md"
                            : "bg-slate-700 md:bg-gray-100 text-slate-200 md:text-gray-700 hover:bg-slate-600 md:hover:bg-gray-200"
                        }`}
                      >
                        {trade}{isSelected && <span className="text-xs ml-1">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full h-32 border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 md:focus:ring-blue-500 focus:border-transparent resize-none bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400"
                placeholder="Describe the job (size, problem, location in house)"
                maxLength={1000}
              />
              <p className="text-xs text-slate-400 md:text-gray-500 mt-1">{formData.shortDescription.length}/1000</p>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">Budget (optional)</label>
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                <div>
                  <label className="block text-xs text-slate-400 md:text-gray-600 mb-1">Min £</label>
                  <input
                    type="number"
                    value={formData.payMin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMin: e.target.value }))}
                    className="w-full border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 md:text-gray-600 mb-1">Max £</label>
                  <input
                    type="number"
                    value={formData.payMax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMax: e.target.value }))}
                    className="w-full border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 md:text-gray-600 mb-1">Per</label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payFrequency: e.target.value }))}
                    className="w-full border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900"
                  >
                    {getPayFrequencyOptions(isPtBR)
                      .filter((o) => ["per_job", "per_hour", "per_day"].includes(o.value))
                      .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">Photo (optional)</label>
              <p className="text-xs text-slate-400 md:text-gray-500 mb-2">Add a photo to help tradespeople understand the job</p>
              {!formData.jobPhotoUrl ? (
                <div className="border-2 border-dashed border-slate-600 md:border-gray-300 rounded-xl p-4 text-center bg-slate-800/50 md:bg-transparent">
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" id="job-photo-gallery" />
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" id="job-photo-camera" />
                  <div className="flex gap-3 justify-center">
                    <label htmlFor="job-photo-gallery" className="flex items-center gap-2 px-4 py-2 bg-slate-700 md:bg-gray-100 hover:bg-slate-600 md:hover:bg-gray-200 text-slate-200 md:text-gray-700 rounded-lg cursor-pointer text-sm font-medium">
                      Gallery
                    </label>
                    <label htmlFor="job-photo-camera" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer text-sm font-medium">
                      Take Photo
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img src={formData.jobPhotoUrl} alt="Job preview" className="w-full h-48 object-cover rounded-xl border border-slate-700 md:border-0" />
                  <button type="button" onClick={handleRemovePhoto} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }

      case 2:
        // For tradespeople jobs, show urgency options
        if (formData.postingType === "tradespeople") {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white md:text-gray-900">How urgently do you need this done?</h3>
              <p className="text-sm text-slate-400 md:text-gray-600">Select the urgency level for your job/task</p>

              <div className="space-y-3">
                {/* ASAP Option */}
                <label
                  className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    formData.urgencyType === "asap"
                      ? "border-red-500 bg-red-500/20 md:bg-red-50 shadow-md"
                      : "border-slate-700 md:border-gray-200 hover:border-red-400 md:hover:border-red-300 hover:bg-slate-800 md:hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="urgencyType"
                      value="asap"
                      checked={formData.urgencyType === "asap"}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          urgencyType: "asap",
                          activeDuration: "1_hour",
                        }))
                      }}
                      className="w-4 h-4 text-red-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/20 md:bg-red-100 rounded-full">
                        <Zap className="w-5 h-5 text-red-400 md:text-red-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-white md:text-gray-900">Urgent (ASAP)</span>
                        <p className="text-sm text-slate-400 md:text-gray-500">Find available tradespeople in minutes</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-red-500/20 md:bg-red-100 text-red-400 md:text-red-700 text-sm font-medium rounded-full">
                    Urgent
                  </div>
                </label>

                {/* Today Option */}
                <label
                  className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    formData.urgencyType === "today"
                      ? "border-orange-500 bg-orange-500/20 md:bg-orange-50 shadow-md"
                      : "border-slate-700 md:border-gray-200 hover:border-orange-400 md:hover:border-orange-300 hover:bg-slate-800 md:hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="urgencyType"
                      value="today"
                      checked={formData.urgencyType === "today"}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          urgencyType: "today",
                          activeDuration: "today",
                        }))
                      }}
                      className="w-4 h-4 text-orange-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 md:bg-orange-100 rounded-full">
                        <Clock className="w-5 h-5 text-orange-400 md:text-orange-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-white md:text-gray-900">Today</span>
                        <p className="text-sm text-slate-400 md:text-gray-500">Get responses within a few hours</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-orange-500/20 md:bg-orange-100 text-orange-400 md:text-orange-700 text-sm font-medium rounded-full">
                    Same Day
                  </div>
                </label>

                {/* Flexible Option */}
                <label
                  className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    formData.urgencyType === "flexible"
                      ? "border-blue-500 bg-blue-500/20 md:bg-blue-50 shadow-md"
                      : "border-slate-700 md:border-gray-200 hover:border-blue-400 md:hover:border-blue-300 hover:bg-slate-800 md:hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="urgencyType"
                      value="flexible"
                      checked={formData.urgencyType === "flexible"}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          urgencyType: "flexible",
                          activeDuration: `${prev.flexibleDays}_days`,
                        }))
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 md:bg-blue-100 rounded-full">
                        <Calendar className="w-5 h-5 text-blue-400 md:text-blue-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-white md:text-gray-900">Flexible (1–7 days)</span>
                        <p className="text-sm text-slate-400 md:text-gray-500">Tradespeople will see your job on the map</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-blue-500/20 md:bg-blue-100 text-blue-400 md:text-blue-700 text-sm font-medium rounded-full">
                    Flexible
                  </div>
                </label>

                {/* Days dropdown for Flexible option */}
                {formData.urgencyType === "flexible" && (
                  <div className="ml-4 md:ml-12 mt-2 p-4 bg-blue-500/20 md:bg-blue-50 border border-blue-500/30 md:border-blue-200 rounded-xl">
                    <label className="block text-sm font-medium text-blue-300 md:text-blue-800 mb-2">
                      Select number of days
                    </label>
                    <div className="relative">
                      <select
                        value={formData.flexibleDays}
                        onChange={(e) => {
                          const days = parseInt(e.target.value)
                          setFormData((prev) => ({
                            ...prev,
                            flexibleDays: days,
                            activeDuration: `${days}_days`,
                          }))
                        }}
                        className="w-full appearance-none bg-slate-700 md:bg-white border border-slate-600 md:border-blue-300 rounded-lg p-3 pr-10 text-white md:text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <option key={day} value={day}>
                            {day} {day === 1 ? "day" : "days"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 md:text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info box about urgency */}
              <div className="mt-4 p-4 bg-slate-800 md:bg-gray-50 border border-slate-700/50 md:border-gray-200 rounded-xl">
                <p className="text-sm text-slate-300 md:text-gray-600">
                  <strong className="text-white md:text-gray-900">Note:</strong> Tradespeople will see a countdown timer showing how much time they have left to apply. More urgent jobs appear higher in search results.
                </p>
              </div>
            </div>
          )
        }

      case 3:
        const hasProfileLocation = companyProfile?.latitude && companyProfile?.longitude

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white md:text-gray-900">Location</h3>
            <p className="text-sm text-slate-400 md:text-gray-600">
              <span className="text-red-400">*</span> You must select a location. This is mandatory.
            </p>

            {/* Location Choice Radio Buttons */}
            {hasProfileLocation && (
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">Is this job at your location?</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <label
                    className={`flex items-center justify-center p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all text-sm md:text-base ${
                      locationChoice === "myLocation"
                        ? "border-emerald-500 md:border-blue-500 bg-emerald-500/20 md:bg-blue-50"
                        : "border-slate-700 md:border-gray-200 hover:border-emerald-400 md:hover:border-blue-300 hover:bg-slate-800 md:hover:bg-gray-50"
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
                    <span className="font-medium text-white md:text-gray-900">Yes, at my location</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all text-sm md:text-base ${
                      locationChoice === "differentLocation"
                        ? "border-orange-500 bg-orange-500/20 md:bg-orange-50"
                        : "border-slate-700 md:border-gray-200 hover:border-orange-400 md:hover:border-orange-300 hover:bg-slate-800 md:hover:bg-gray-50"
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
                    <span className="font-medium text-white md:text-gray-900">No, different location</span>
                  </label>
                </div>
              </div>
            )}

            {/* Show location confirmation if "myLocation" selected */}
            {locationChoice === "myLocation" && hasProfileLocation && (
              <div className="p-4 bg-emerald-500/20 md:bg-green-50 border border-emerald-500/30 md:border-green-200 rounded-xl">
                <p className="text-sm text-emerald-300 md:text-green-800 font-medium mb-1">✓ Using your business location:</p>
                <p className="text-sm text-emerald-200 md:text-green-700">{companyProfile.location || "Location set from your profile"}</p>
                <p className="text-xs text-emerald-400 md:text-green-600 mt-1">
                  Coordinates: {companyProfile.latitude.toFixed(4)}, {companyProfile.longitude.toFixed(4)}
                </p>
              </div>
            )}

            {/* Show map picker if "differentLocation" selected OR no profile location */}
            {(locationChoice === "differentLocation" || !hasProfileLocation) && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">Full Address (optional)</label>
                  <input
                    type="text"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullAddress: e.target.value }))}
                    className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 md:focus:ring-blue-500 focus:border-transparent mb-4 bg-slate-700 md:bg-white border-slate-600 md:border-gray-300 text-white md:text-gray-900 placeholder:text-slate-400"
                    placeholder="Enter full street address (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white md:text-gray-900">
                    Location on Map <span className="text-red-400">*</span>
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
                    <p className="text-sm text-emerald-400 md:text-green-600 mt-2">
                      ✓ Location selected: {formData.locationCoords.lat.toFixed(4)}, {formData.locationCoords.lon.toFixed(4)}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Job Summary */}
            <div className="mt-6 p-4 bg-slate-800 md:bg-blue-50 border border-slate-700/50 md:border-blue-200 rounded-xl">
              <h4 className="font-semibold text-emerald-400 md:text-blue-900 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Job Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400 md:text-gray-600">Job Title:</span>
                  <span className="font-medium text-white md:text-gray-900">{formData.profession || "Not set"}</span>
                </div>
                {formData.payMin && formData.payMax && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 md:text-gray-600">Budget:</span>
                    <span className="font-medium text-white md:text-gray-900">
                      £{formData.payMin} - £{formData.payMax} {formData.payFrequency.replace('_', ' ')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 md:text-gray-600">Description:</span>
                  <span className="font-medium text-white md:text-gray-900 text-right max-w-[200px] truncate">
                    {formData.shortDescription || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 md:text-gray-600">Photo Attached:</span>
                  <span className={`font-medium ${formData.jobPhotoUrl ? "text-emerald-400 md:text-green-600" : "text-slate-500 md:text-gray-400"}`}>
                    {formData.jobPhotoUrl ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 md:text-gray-600">Active Duration:</span>
                  <span className="font-medium text-white md:text-gray-900">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 md:bg-black/40"
        >
          <div
            className="w-full h-full md:h-auto md:max-h-[90vh] max-w-2xl bg-slate-900 md:bg-white md:rounded-lg shadow-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 md:p-6 border-b border-slate-700/50 md:border-gray-200 bg-slate-800 md:bg-white">
              <div className="flex items-center gap-3 md:gap-4">
                {companyProfile?.logo_url && userType === "company" && (
                  <img
                    src={companyProfile.logo_url}
                    alt="Company logo"
                    className="w-10 h-10 rounded-lg md:rounded object-cover border border-slate-600 md:border-0"
                  />
                )}
                <div>
                  <h2 className="text-lg md:text-xl font-semibold text-white md:text-gray-900">Post a Job</h2>
                  <p className="text-xs md:text-sm text-slate-400 md:text-gray-500">Step {currentStep} of {totalSteps}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 md:text-gray-500 hover:text-white md:hover:text-gray-700 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b border-slate-700/50 md:border-gray-200 bg-slate-800/50 md:bg-white">
              <div className="w-full bg-slate-700 md:bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 md:bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto bg-slate-900 md:bg-white">
              {renderStep()}
              {err && <div className="mt-4 p-3 bg-red-500/20 md:bg-red-50 border border-red-500/30 md:border-red-200 text-red-400 md:text-red-600 text-sm rounded-lg">{err}</div>}
            </div>

            {/* Footer - fixed at bottom, transparent background */}
            <div className="fixed md:relative bottom-16 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-20 md:z-auto flex-shrink-0 flex items-center justify-between p-4 md:p-6 pointer-events-none">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2 border border-slate-600 md:border-gray-300 text-slate-300 md:text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 md:hover:bg-gray-50 bg-slate-800 md:bg-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="pointer-events-auto flex items-center gap-2 px-6 py-2 bg-emerald-600 md:bg-blue-600 text-white rounded-lg hover:bg-emerald-700 md:hover:bg-blue-700"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="pointer-events-auto px-6 py-2 bg-emerald-600 md:bg-blue-600 text-white rounded-lg hover:bg-emerald-700 md:hover:bg-blue-700 disabled:opacity-50"
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
