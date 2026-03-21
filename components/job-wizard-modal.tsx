"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import MapLocationPicker from "./map-location-picker"
import { LocationInput } from "./location-input"
import { X, ArrowLeft, ArrowRight, Eye, Briefcase, Hammer, Zap, Clock, Calendar, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/context"
import { useActiveSearch } from "@/lib/contexts/active-search-context"
import { TRADE_INDUSTRIES, INDUSTRY_TO_CATEGORY as TRADE_INDUSTRY_TO_CATEGORY, findTradeIndustry } from "@/lib/data/trade-industries"

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
  urgencyType: "asap" | "flexible" | ""
  flexibleDays: number
  // Step 3: Job details
  profession: string   // kept for employee-type jobs
  industry: string     // tradespeople jobs: industry (matches company_profiles.industry)
  service: string      // tradespeople jobs: specific service/subcategory (optional)
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

// Maps wizard profession names to the canonical category values used by the job search filter
const PROFESSION_TO_CATEGORY: Record<string, string> = {
  // EN
  "Plumber": "Plumbing",
  "Electrician": "Electrical",
  "Builder": "Construction",
  "Carpenter": "Carpentry",
  "Painter": "Painting & Decorating",
  "Painter & Decorator": "Painting & Decorating",
  "Decorator": "Painting & Decorating",
  "Roofer": "Roofing",
  "Gardener": "Gardening",
  "Cleaner": "Cleaning",
  "Handyman": "General Handyman",
  "General Handyman": "General Handyman",
  "Locksmith": "General Handyman",
  "Bathrooms": "Plumbing",
  "Bathroom Fitter": "Plumbing",
  "Tiler": "Flooring",
  "Heating": "Electrical",
  "Heating Engineer": "Electrical",
  "Gas Boiler": "Electrical",
  "Gas Engineer": "Electrical",
  "Plasterer": "Construction",
  "Driveways": "Construction",
  "Driveway Specialist": "Construction",
  "Fencing": "Carpentry",
  "Tree Surgeon": "Gardening",
  "Windows/Doors": "Carpentry",
  "Window Fitter": "Carpentry",
  "Door Fitter": "Carpentry",
  "Mechanic": "General Handyman",
  "Flooring": "Flooring",
  "Flooring Specialist": "Flooring",
  "Kitchen Fitter": "Carpentry",
  "HVAC": "Electrical",
  "HVAC Engineer": "Electrical",
  "Glazier": "Construction",
  "Bricklayer": "Construction",
  "Scaffolder": "Construction",
  "Welder": "Construction",
  // PT-BR
  "Encanador": "Plumbing",
  "Eletricista": "Electrical",
  "Construtor": "Construction",
  "Carpinteiro": "Carpentry",
  "Pintor": "Painting & Decorating",
  "Pintor & Decorador": "Painting & Decorating",
  "Telhador": "Roofing",
  "Jardineiro": "Gardening",
  "Faxineiro": "Cleaning",
  "Faz-Tudo": "General Handyman",
  "Faz-Tudo Geral": "General Handyman",
  "Chaveiro": "General Handyman",
  "Banheiros": "Plumbing",
  "Instalador de Banheiros": "Plumbing",
  "Azulejista": "Flooring",
  "Aquecimento": "Electrical",
  "Engenheiro de Aquecimento": "Electrical",
  "Caldeira a Gás": "Electrical",
  "Engenheiro de Gás": "Electrical",
  "Gesseiro": "Construction",
  "Calçadas": "Construction",
  "Especialista em Calçadas": "Construction",
  "Cercas": "Carpentry",
  "Cirurgião de Árvores": "Gardening",
  "Janelas/Portas": "Carpentry",
  "Instalador de Janelas": "Carpentry",
  "Instalador de Portas": "Carpentry",
  "Mecânico": "General Handyman",
  "Pisos": "Flooring",
  "Especialista em Pisos": "Flooring",
  "Instalador de Cozinhas": "Carpentry",
  "Engenheiro HVAC": "Electrical",
  "Vidraceiro": "Construction",
  "Decorador": "Painting & Decorating",
  "Pedreiro": "Construction",
  "Andaimeiro": "Construction",
  "Soldador": "Construction",
}

// Use the shared trade industry list (same as tradesperson profile forms)
// TRADE_INDUSTRIES and INDUSTRY_TO_CATEGORY imported from lib/data/trade-industries.ts
const INDUSTRY_TO_CATEGORY = TRADE_INDUSTRY_TO_CATEGORY

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
  const { setActiveSearch } = useActiveSearch()

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
  const [isGeocodingPostcode, setIsGeocodingPostcode] = useState(false)

  const geocodeProfileLocation = async (locationText: string) => {
    setIsGeocodingPostcode(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1&countrycodes=gb,us,de,fr,br&addressdetails=1`
      )
      if (!res.ok) return
      const data = await res.json()
      if (data.length > 0) {
        const result = data[0]
        setFormData((prev) => ({
          ...prev,
          locationCoords: { lat: parseFloat(result.lat), lon: parseFloat(result.lon) },
          fullAddress: prev.fullAddress || result.display_name,
        }))
      }
    } catch {
      // Silent fail — user can still click the map manually
    } finally {
      setIsGeocodingPostcode(false)
    }
  }

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
    industry: "",
    service: "",
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
    if (redirectPath) {
      router.push(redirectPath)
    } else {
      router.back()
    }
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
      const processedFile = await compressImage(file, 1024 * 1024) // 1MB target, always convert to JPEG

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
        if (formData.postingType === "tradespeople") {
          if (!formData.industry) {
            setErr("Please select an industry.")
            return false
          }
        } else {
          if (!formData.profession.trim()) {
            setErr("Please enter the trade / service.")
            return false
          }
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
        const hasProfileLocation = !!(companyProfile?.location || (companyProfile?.latitude && companyProfile?.longitude))
        if (hasProfileLocation && !locationChoice) {
          setErr("Please choose whether this job is at your location or a different location.")
          return false
        }
        if (isGeocodingPostcode) {
          setErr("Please wait — finding your location…")
          return false
        }
        if (!formData.locationCoords) {
          setErr("Please select a location on the map.")
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

    // Timeout protection - automatically reset loading after 30 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setErr("Request timed out. Please check your connection and try again.")
    }, 30000)

    try {
      // Use the already-loaded profile to get user ID — no auth network call needed.
      // RLS on the jobs table will enforce auth on the actual INSERT.
      const userId: string | undefined = companyProfile?.user_id
      if (!userId) {
        clearTimeout(timeoutId)
        setErr("Authentication required.")
        setLoading(false)
        return
      }
      const user = { id: userId }

      // Homeowners don't have subscriptions — they can always post trade jobs
      if (userType !== "homeowner") {
        const { data: canPost, error: checkError } = await supabase
          .rpc("can_user_post_job", { user_id_param: user.id })

        if (checkError) {
          clearTimeout(timeoutId)
          setErr("Failed to verify posting permissions.")
          setLoading(false)
          return
        }

        if (!canPost.can_post) {
          clearTimeout(timeoutId)
          if (canPost.reason === 'no_subscription') {
            setErr("You need an active subscription to post jobs. Please visit the Subscription page.")
          } else if (canPost.reason === 'job_limit_exceeded') {
            setErr(`You have reached your job posting limit (${canPost.jobs_used}/${canPost.jobs_limit}). Please upgrade your subscription.`)
          } else {
            setErr("You are not authorized to post jobs at this time.")
          }
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

      // Upload job photo if provided (5 s timeout — non-blocking if storage unavailable)
      let jobPhotoPublicUrl: string | null = null
      if (formData.jobPhoto && formData.postingType === "tradespeople") {
        try {
          const fileName = `${user.id}/${Date.now()}.jpg`
          const photoAbort = new AbortController()
          const photoTimeout = setTimeout(() => photoAbort.abort(), 5000)

          const uploadPromise = supabase.storage
            .from('job-photos')
            .upload(fileName, formData.jobPhoto, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            })

          // Race upload against 5-second abort
          const { error: uploadError } = await Promise.race([
            uploadPromise,
            new Promise<{ data: null; error: Error }>((resolve) =>
              photoAbort.signal.addEventListener("abort", () =>
                resolve({ data: null, error: new Error("upload_timeout") })
              )
            ),
          ])

          clearTimeout(photoTimeout)

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName)
            jobPhotoPublicUrl = urlData.publicUrl
          }
          // If upload failed or timed out, continue without photo (non-fatal)
        } catch {
          // Continue without photo
        }
      }

      const fullDescription = formData.shortDescription

      // ── Budget validation ────────────────────────────────────────────
      const budgetMin = formData.payMin ? Number.parseInt(formData.payMin) : null
      const budgetMax = formData.payMax ? Number.parseInt(formData.payMax) : null

      if (budgetMin !== null && isNaN(budgetMin)) {
        setErr("Please enter a valid minimum budget.")
        setLoading(false)
        return
      }
      if (budgetMax !== null && isNaN(budgetMax)) {
        setErr("Please enter a valid maximum budget.")
        setLoading(false)
        return
      }
      if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
        setErr("Minimum budget cannot be greater than the maximum budget.")
        setLoading(false)
        return
      }
      // ─────────────────────────────────────────────────────────────────

      const payload: any = {
        company_id: userType === "company" ? companyProfile.id : null,
        homeowner_id: userType === "homeowner" ? companyProfile.id : null,
        title: formData.postingType === "tradespeople"
          ? (formData.service && formData.service !== "Not sure / Other"
              ? formData.service
              : formData.industry || formData.profession).trim()
          : formData.profession.trim(),
        industry: formData.postingType === "tradespeople" ? formData.industry || null : null,
        service: formData.postingType === "tradespeople" && formData.service && formData.service !== "Not sure / Other"
          ? formData.service
          : null,
        category: formData.postingType === "tradespeople"
          ? INDUSTRY_TO_CATEGORY[formData.industry] ?? PROFESSION_TO_CATEGORY[formData.profession.trim()] ?? null
          : null,
        location: formData.fullAddress,
        latitude: formData.locationCoords?.lat ?? companyProfile?.latitude ?? null,
        longitude: formData.locationCoords?.lon ?? companyProfile?.longitude ?? null,
        work_location: "onsite",
        description: fullDescription,
        short_description: formData.shortDescription,
        country: "United Kingdom",
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
        budget_min: budgetMin,
        budget_max: budgetMax,
        budget_period: formData.payFrequency,
        languages: formData.languages.length > 0 ? formData.languages : null,
        status: "POSTED",
        is_active: true,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString(),
      }

      // Add photo URL if uploaded
      if (jobPhotoPublicUrl) {
        payload.job_photo_url = jobPhotoPublicUrl
      }

      // Generate UUID client-side so we know the job ID without needing SELECT to return it.
      // This avoids the common hang where INSERT succeeds but the postgrest RETURNING query stalls.
      const jobId = crypto.randomUUID()
      payload.id = jobId

      // Use the server-side API route (admin/service_role) to avoid
      // client-side RLS subquery hangs. 15-second abort for safety.
      const insertAbort = new AbortController()
      const insertAbortId = setTimeout(() => insertAbort.abort(), 15_000)

      let insertErrMsg: string | null = null
      try {
        const res = await fetch("/api/jobs", {
          method:      "POST",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify(payload),
          credentials: "include",
          signal:      insertAbort.signal,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          insertErrMsg = body?.error ?? `HTTP ${res.status}`
        }
      } catch (fetchErr: any) {
        insertErrMsg = fetchErr?.message ?? String(fetchErr)
        console.error("[JOB-WIZARD] API fetch threw:", fetchErr)
      } finally {
        clearTimeout(insertAbortId)
      }

      if (insertErrMsg) {
        clearTimeout(timeoutId)
        console.error("[JOB-WIZARD] Insert error:", insertErrMsg)
        setErr(`Failed to post job: ${insertErrMsg}`)
        setLoading(false)
        return
      }

      clearTimeout(timeoutId)

      // ── Everything below is fire-and-forget. ─────────────────
      // The job exists in the DB. Redirect immediately; never block on these.
      if (formData.postingType === "tradespeople" && formData.locationCoords) {
        const posterName = userType === "homeowner"
          ? `${companyProfile.first_name || ""} ${companyProfile.last_name || ""}`.trim() || "A homeowner"
          : companyProfile.company_name || "A company"

        // Bell notifications go to ALL trade jobs (flexible + urgent)
        // Skills array includes service, industry, and profession for broad matching
        const skillsToNotify = [
          formData.service && formData.service !== "Not sure / Other" ? formData.service : null,
          formData.industry || null,
          formData.profession.trim() || null,
        ].filter(Boolean) as string[]

        fetch("/api/notifications/send-trade-job-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            jobTitle: formData.service || formData.profession.trim(),
            jobLat: formData.locationCoords.lat,
            jobLon: formData.locationCoords.lon,
            jobSkills: skillsToNotify,
            posterName,
            urgencyType: formData.urgencyType,
            jobIndustry: formData.industry || null,
            jobService: (formData.service && formData.service !== "Not sure / Other") ? formData.service : null,
          }),
        }).catch(() => {})

        // Uber-style dispatch only for urgent jobs
        if (formData.urgencyType === "asap" || formData.urgencyType === "today") {
          fetch(`/api/jobs/${jobId}/dispatch-urgent`, { method: "POST" }).catch(() => {})
        }
      }
      // ─────────────────────────────────────────────────────────

      const isFlexible = formData.urgencyType === "flexible"

      if (isFlexible) {
        // Flexible jobs: simple confirmation, no live-tracking, no active search bar
        toast({
          title: "✅ Job Posted!",
          description: "Your job is live on the map. Nearby tradespeople have been notified.",
          variant: "default",
        })
        setLoading(false)
        router.push(`/jobs/${jobId}`)
      } else {
        // Urgent (ASAP/Today): uber-style live tracking
        toast({
          title: "✅ Job Posted Successfully!",
          description: "Finding the best available trades near you…",
          variant: "default",
        })
        setActiveSearch({
          jobId,
          jobTitle: formData.profession.trim() || "Job",
          tradesCount:   0,
          notifiedCount: 0,
          phase:         "searching",
          startedAt:     Date.now(),
          userId,
        })
        setLoading(false)
        router.push(`/jobs/${jobId}/live`)
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error("[JOB-WIZARD] Unexpected error:", err)
      const isAbort = err?.name === "AbortError" || err?.message?.includes("aborted")
      setErr(isAbort
        ? "Job posting timed out. Please check your connection and try again."
        : (err?.message || "An unexpected error occurred. Please try again."))
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
                  className="text-sm text-slate-400 hover:text-blue-500 hover:underline"
                >
                  Posting a long-term role? <span className="font-medium">Switch to Vacancy →</span>
                </button>
              </div>
            )}

            <h3 className="text-lg font-semibold text-white">Job / Task Details</h3>

            {/* Industry dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Type of trade needed <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value, service: "" }))}
                  className="w-full border rounded-xl p-3 pr-10 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 border-slate-600 text-white appearance-none"
                >
                  <option value="">Select a trade…</option>
                  {TRADE_INDUSTRIES.map((ind) => (
                    <option key={ind.title} value={ind.title}>
                      {ind.icon} {ind.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Service dropdown — only shown when an industry with services is selected */}
            {(() => {
              const selectedInd = TRADE_INDUSTRIES.find(i => i.title === formData.industry)
              if (!selectedInd || selectedInd.services.length === 0) return null
              return (
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Specific service{" "}
                    <span className="text-slate-400 font-normal text-xs">(recommended)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData((prev) => ({ ...prev, service: e.target.value }))}
                      className="w-full border rounded-xl p-3 pr-10 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 border-slate-600 text-white appearance-none"
                    >
                      <option value="">Not sure / Any</option>
                      {selectedInd.services.map((svc) => (
                        <option key={svc} value={svc}>{svc}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Helps match you with tradespeople who specialise in this service
                  </p>
                </div>
              )
            })()}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full h-32 border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                placeholder="Describe the job (size, problem, location in house)"
                maxLength={1000}
              />
              <p className="text-xs text-slate-400 mt-1">{formData.shortDescription.length}/1000</p>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Budget (optional)</label>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min £</label>
                  <input
                    type="number"
                    value={formData.payMin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMin: e.target.value }))}
                    className="w-full border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Max £</label>
                  <input
                    type="number"
                    value={formData.payMax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMax: e.target.value }))}
                    className="w-full border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Photo (optional)</label>
              <p className="text-xs text-slate-400 mb-2">Add a photo to help tradespeople understand the job</p>
              {!formData.jobPhotoUrl ? (
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center bg-slate-800/50">
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" id="job-photo-gallery" />
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" id="job-photo-camera" />
                  <div className="flex gap-3 justify-center">
                    <label htmlFor="job-photo-gallery" className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg cursor-pointer text-sm font-medium">
                      Gallery
                    </label>
                    <label htmlFor="job-photo-camera" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer text-sm font-medium">
                      Take Photo
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img src={formData.jobPhotoUrl} alt="Job preview" className="w-full h-48 object-cover rounded-xl border border-slate-700" />
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
              <h3 className="text-lg font-semibold text-white">How urgently do you need this done?</h3>
              <p className="text-sm text-slate-400">Select the urgency level for your job/task</p>

              <div className="space-y-3">
                {/* ASAP Option */}
                <label
                  className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    formData.urgencyType === "asap"
                      ? "border-red-500 bg-red-500/20 shadow-md"
                      : "border-slate-700 hover:border-red-400 hover:bg-slate-800"
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
                      <div className="p-2 bg-red-500/20 rounded-full">
                        <Zap className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">Urgent (ASAP)</span>
                        <p className="text-sm text-slate-400">Find available tradespeople in minutes</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded-full">
                    Urgent
                  </div>
                </label>

                {/* ASAP info banner — shown immediately below when selected */}
                {formData.urgencyType === "asap" && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <Zap className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300 leading-snug">
                      We will notify nearby tradespeople immediately.<br />
                      You may start receiving responses within minutes.
                    </p>
                  </div>
                )}

                {/* Flexible Option */}
                <label
                  className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    formData.urgencyType === "flexible"
                      ? "border-blue-500 bg-blue-500/20 shadow-md"
                      : "border-slate-700 hover:border-blue-400 hover:bg-slate-800"
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
                      <div className="p-2 bg-blue-500/20 rounded-full">
                        <Calendar className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">Flexible (1–7 days)</span>
                        <p className="text-sm text-slate-400">Tradespeople will see your job on the map</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                    Flexible
                  </div>
                </label>

                {/* Days dropdown for Flexible option */}
                {formData.urgencyType === "flexible" && (
                  <div className="ml-4 md:ml-12 mt-2 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                    <label className="block text-sm font-medium text-blue-300 mb-2">
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
                        className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-lg p-3 pr-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <option key={day} value={day}>
                            {day} {day === 1 ? "day" : "days"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info box — only shown for flexible (ASAP has its own banner above) */}
              {formData.urgencyType === "flexible" && (
                <div className="mt-4 p-4 bg-slate-800 border border-slate-700/50 rounded-xl">
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Note:</strong> Your job will be visible on the map to nearby tradespeople for the selected number of days.
                  </p>
                </div>
              )}
            </div>
          )
        }

      case 3:
        const hasProfileLocation = !!(companyProfile?.location || (companyProfile?.latitude && companyProfile?.longitude))
        const hasProfileCoords = !!(companyProfile?.latitude && companyProfile?.longitude)

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Location</h3>
            <p className="text-sm text-slate-400">
              <span className="text-red-400">*</span> You must select a location. This is mandatory.
            </p>

            {/* Location Choice Radio Buttons */}
            {hasProfileLocation && (
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium mb-2 text-white">Where is this job?</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <label
                    className={`flex items-center justify-center p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all text-sm md:text-base ${
                      locationChoice === "myLocation"
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-slate-700 hover:border-emerald-400 hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="locationChoice"
                      checked={locationChoice === "myLocation"}
                      onChange={() => {
                        setLocationChoice("myLocation")
                        if (hasProfileCoords) {
                          // Profile has exact coords — use them directly
                          setFormData((prev) => ({
                            ...prev,
                            fullAddress: companyProfile.location || "",
                            locationCoords: { lat: companyProfile.latitude, lon: companyProfile.longitude },
                          }))
                        } else if (companyProfile?.location) {
                          // Profile has text/postcode only — geocode it
                          setFormData((prev) => ({ ...prev, fullAddress: companyProfile.location, locationCoords: null }))
                          geocodeProfileLocation(companyProfile.location)
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="font-medium text-white">At my location</span>
                  </label>

                  <label
                    className={`flex items-center justify-center p-3 md:p-4 border-2 rounded-xl cursor-pointer transition-all text-sm md:text-base ${
                      locationChoice === "differentLocation"
                        ? "border-orange-500 bg-orange-500/20"
                        : "border-slate-700 hover:border-orange-400 hover:bg-slate-800"
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
                    <span className="font-medium text-white">Other location</span>
                  </label>
                </div>
              </div>
            )}

            {/* Show location confirmation if "myLocation" selected with coords */}
            {locationChoice === "myLocation" && hasProfileCoords && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <p className="text-sm text-emerald-300 truncate">{companyProfile.location || "Using your saved location"}</p>
              </div>
            )}

            {/* Show map picker if "differentLocation" selected, OR no profile location, OR myLocation with no stored coords */}
            {(locationChoice === "differentLocation" || !hasProfileLocation || (locationChoice === "myLocation" && !hasProfileCoords)) && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-white">
                    Pin your location
                    {locationChoice !== "myLocation" && <span className="text-red-400"> *</span>}
                  </label>
                  {formData.locationCoords && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Location set
                    </span>
                  )}
                </div>

                {/* Postcode / address input with autocomplete */}
                <div className="mb-2">
                  <LocationInput
                    value={formData.fullAddress}
                    onChange={(val) => setFormData((prev) => ({ ...prev, fullAddress: val }))}
                    onLocationSelect={(address, lat, lon) => {
                      setFormData((prev) => ({
                        ...prev,
                        fullAddress: address,
                        locationCoords: { lat, lon },
                      }))
                    }}
                    placeholder="Enter postcode or address"
                  />
                </div>

                {isGeocodingPostcode ? (
                  <div className="flex items-center justify-center gap-2 h-16 rounded-xl border border-slate-600 bg-slate-800/60 text-slate-400 text-xs">
                    <svg className="animate-spin h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Finding your location…
                  </div>
                ) : (
                  <>
                    {locationChoice === "myLocation" && !formData.locationCoords && !isGeocodingPostcode && (
                      <p className="text-xs text-amber-400 mb-1.5">Postcode not found — tap the map to set your location</p>
                    )}
                    <div className="rounded-xl overflow-hidden border border-slate-700/60">
                      <MapLocationPicker
                        value={formData.locationCoords ? {
                          latitude: formData.locationCoords.lat,
                          longitude: formData.locationCoords.lon,
                          address: formData.fullAddress
                        } : null}
                        onChange={handleMapLocationSelect}
                        height="210px"
                        placeholder={locationChoice === "myLocation" ? "Adjust pin if needed" : "Tap to set location"}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Compact Job Summary */}
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-800/60 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/40">
                <Eye className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Summary</span>
              </div>
              <div className="px-3 py-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Job</span>
                  <span className="font-medium text-white text-right truncate max-w-[60%]">{formData.profession || "—"}</span>
                </div>
                {formData.payMin && formData.payMax && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Budget</span>
                    <span className="font-medium text-white">£{formData.payMin}–£{formData.payMax}</span>
                  </div>
                )}
                {formData.shortDescription && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Details</span>
                    <span className="font-medium text-white text-right truncate max-w-[60%]">{formData.shortDescription}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Urgency</span>
                  <span className={`font-medium ${formData.urgencyType === "asap" ? "text-red-400" : "text-blue-400"}`}>
                    {formData.urgencyType === "asap" ? "ASAP" : formData.urgencyType === "flexible" ? `Flexible · ${formData.flexibleDays}d` : "—"}
                  </span>
                </div>
                {formData.jobPhotoUrl && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Photo</span>
                    <span className="font-medium text-emerald-400">Attached</span>
                  </div>
                )}
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
            className="w-full h-full md:h-auto md:max-h-[90vh] max-w-2xl bg-slate-900 md:rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 md:px-6 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10">
              <div className="flex items-center gap-3">
                {companyProfile?.logo_url && userType === "company" && (
                  <img
                    src={companyProfile.logo_url}
                    alt="Company logo"
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-white/20"
                  />
                )}
                <div>
                  <h2 className="text-base md:text-lg font-bold text-white tracking-tight">Post a Job</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Step {currentStep} of {totalSteps}</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar + step indicators */}
            <div className="flex-shrink-0 px-4 md:px-6 pt-3 pb-2 bg-slate-900 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 ${
                      step < currentStep
                        ? "bg-emerald-500 text-white"
                        : step === currentStep
                        ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50"
                        : "bg-slate-800 text-slate-600 ring-1 ring-slate-700"
                    }`}>
                      {step < currentStep ? "✓" : step}
                    </div>
                    {step < totalSteps && (
                      <div className="flex-1 h-0.5 mx-1.5 rounded-full overflow-hidden bg-slate-800">
                        <div className={`h-full rounded-full transition-all duration-500 ${step < currentStep ? "bg-emerald-500 w-full" : "w-0"}`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 p-4 md:p-6 pb-36 md:pb-6 overflow-y-auto bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {renderStep()}
              {err && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg">{err}</div>}
            </div>

            {/* Footer */}
            <div className="fixed md:relative bottom-16 left-0 right-0 md:bottom-auto md:left-auto md:right-auto z-20 md:z-auto flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4 pointer-events-none border-t border-white/10 bg-slate-900/95 backdrop-blur-sm">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 border border-slate-700/80 text-slate-400 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-slate-200 transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="pointer-events-auto flex items-center gap-2 px-7 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 active:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/25"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="pointer-events-auto flex items-center gap-2 px-7 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 active:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Publishing…
                    </>
                  ) : "Publish Job"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
