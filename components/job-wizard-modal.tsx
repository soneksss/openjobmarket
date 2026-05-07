"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import MapLocationPicker from "./map-location-picker"
import { LocationInput } from "./location-input"
import { X, ArrowLeft, ArrowRight, Eye, Briefcase, Hammer, Zap, Clock, Calendar, ChevronDown, User, Mail, Phone, Lock, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/context"
import { useActiveSearch } from "@/lib/contexts/active-search-context"
import { TRADE_INDUSTRIES, INDUSTRY_TO_CATEGORY as TRADE_INDUSTRY_TO_CATEGORY, findTradeIndustry } from "@/lib/data/trade-industries"
import imageCompression from "browser-image-compression"

type Props = {
  companyProfile: any
  userType: "company" | "homeowner"
  redirectPath?: string
  initialIndustry?: string
  initialService?: string
  guestMode?: boolean      // true when user is not authenticated
  initialPostcode?: string // pre-fills Step 3 location from homepage input
}

type JobFormData = {
  // Step 1: Active duration (subscription-based, no pricing)
  activeDuration: string
  // Step 2: Job posting type
  postingType: "employee" | "tradespeople"
  // Step 2b: Urgency for tradespeople jobs
  urgencyType: "asap" | "today" | "flexible" | "" // "" = not yet selected (validated before submit)
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
  locationAddressType: 'exact' | 'approx'
  // Step 4: Send mode
  sendMode: "auto" | "manual" | null
}

const extractPostcode = (address: string): string | null => {
  const m = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i)
  return m ? m[0].toUpperCase().replace(/\s+/, ' ') : null
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
  portuguese:          { code: "pt", en: "Portuguese",           ptBR: "Português" },
  brazilian_portuguese:{ code: "br", en: "Brazilian Portuguese", ptBR: "Português Brasileiro" },
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
    "french", "german", "italian", "portuguese", "brazilian_portuguese",
    "arabic", "turkish", "mandarin"
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

export default function JobWizardModal({ companyProfile, userType, redirectPath, initialIndustry, initialService, guestMode = false, initialPostcode }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const { locale } = useTranslation()
  const { setActiveSearch } = useActiveSearch()

  const [open, setOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Hide the global bottom nav while the wizard is open so the keyboard
  // doesn't push it up and block form fields on Android.
  useEffect(() => {
    if (open) {
      document.body.classList.add("wizard-open")
    }
    return () => { document.body.classList.remove("wizard-open") }
  }, [open])
  const [vacancyEnabled, setVacancyEnabled] = useState(true)

  useEffect(() => {
    supabase.rpc("get_public_admin_settings").then(({ data }) => {
      if (data) setVacancyEnabled(data.vacancies_jobseekers_enabled ?? true)
    })
  }, [])

  // 3-step flow for logged-in users; 4-step for guests (step 4 = account creation)
  const isHomeowner = userType === "homeowner"
  const totalSteps = guestMode ? 4 : 3
  const [contactData, setContactData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    termsAccepted: false, ageConfirmation: false,
  })
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
      setErr("Couldn't find your saved address — please pin your location on the map.")
    } finally {
      setIsGeocodingPostcode(false)
    }
  }

  // Pre-fill postcode in guest mode
  useEffect(() => {
    if (!guestMode || !initialPostcode) return
    setFormData((prev) => ({ ...prev, fullAddress: initialPostcode }))
    geocodeProfileLocation(initialPostcode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestMode, initialPostcode])

  // Autocomplete state
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(!initialIndustry)
  const [showServiceDropdown, setShowServiceDropdown] = useState(() => {
    if (!initialIndustry) return false
    const ind = TRADE_INDUSTRIES.find(i => i.title === initialIndustry)
    return !!(ind && ind.services.length > 0 && !initialService)
  })
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
    industry: initialIndustry ?? "",
    service: initialService ?? "",
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
    locationAddressType: 'exact',
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

    // Reject anything over 10MB (before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "⚠️ File Too Large",
        description: "Photo must be under 10MB",
        variant: "destructive",
      })
      return
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "⚠️ Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    const { dismiss } = toast({ title: "Optimising photo…", description: "Just a moment." })

    try {
      const processedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: "image/webp",
      })

      dismiss()
      const previewUrl = URL.createObjectURL(processedFile)
      setFormData((prev) => ({
        ...prev,
        jobPhoto: processedFile,
        jobPhotoUrl: previewUrl,
      }))
    } catch (error) {
      dismiss()
      console.error("[Job Wizard] Error processing image:", error)
      toast({
        title: "❌ Image Processing Failed",
        description: "Failed to process image. Please try another photo.",
        variant: "destructive",
      })
    }
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
      case 3: { // Location
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
      case 4: { // Guest contact details
        if (!contactData.firstName.trim()) { setErr("Please enter your first name."); return false }
        if (!contactData.lastName.trim())  { setErr("Please enter your last name."); return false }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) { setErr("Please enter a valid email address."); return false }
        if (contactData.password.length < 6) { setErr("Password must be at least 6 characters."); return false }
        if (!contactData.ageConfirmation) { setErr("Please confirm you are 18 or over."); return false }
        if (!contactData.termsAccepted)   { setErr("Please accept the Terms & Conditions."); return false }
        break
      }
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setErr(null)
  }

  const handleSubmit = async () => {
    const lastStep = guestMode ? 4 : 3
    if (!validateStep(lastStep)) return

    setLoading(true)

    // Timeout protection - automatically reset loading after 30 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setErr("Request timed out. Please check your connection and try again.")
    }, 30000)

    try {
      // ── Guest mode: create account + post job atomically ─────────────────────
      if (guestMode) {
        const expirationDate = new Date()
        if (formData.urgencyType === "asap") expirationDate.setHours(expirationDate.getHours() + 1)
        else if (formData.urgencyType === "flexible") expirationDate.setDate(expirationDate.getDate() + formData.flexibleDays)
        else expirationDate.setDate(expirationDate.getDate() + 1)

        const jobId = crypto.randomUUID()
        const guestJobData: Record<string, any> = {
          id: jobId,
          title: (formData.service && formData.service !== "Not sure / Other" ? formData.service : formData.industry).trim(),
          industry: formData.industry || null,
          service: formData.service && formData.service !== "Not sure / Other" ? formData.service : null,
          category: INDUSTRY_TO_CATEGORY[formData.industry] ?? formData.industry ?? null,
          location: formData.fullAddress,
          latitude: formData.locationCoords?.lat ?? null,
          longitude: formData.locationCoords?.lon ?? null,
          work_location: "onsite",
          description: formData.shortDescription,
          short_description: formData.shortDescription,
          country: "United Kingdom",
          is_tradespeople_job: true,
          is_urgent: formData.urgencyType !== "flexible",
          urgency_type: formData.urgencyType || null,
          deadline_at: expirationDate.toISOString(),
          search_state: formData.urgencyType === "asap" ? "active_search" : null,
          search_radius_miles: formData.urgencyType === "asap" ? 5 : 10,
          matching_status: "searching",
          max_applications: 5,
          max_responses: formData.urgencyType === "flexible" ? 10 : null,
          broadcast_radius: 5.0,
          current_radius: 5.0,
          max_radius: 50.0,
          last_broadcast_at: new Date().toISOString(),
          homeowner_notified: false,
          budget_min: formData.payMin ? parseInt(formData.payMin) : null,
          budget_max: formData.payMax ? parseInt(formData.payMax) : null,
          budget_period: formData.payFrequency,
          preferred_language: locale ?? "en",
          status: "POSTED",
          is_active: true,
          expires_at: expirationDate.toISOString(),
          created_at: new Date().toISOString(),
        }

        const guestRes = await fetch("/api/auth/create-guest-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName:  contactData.firstName.trim(),
            lastName:   contactData.lastName.trim(),
            email:      contactData.email.trim().toLowerCase(),
            password:   contactData.password,
            phone:      contactData.phone.trim() || undefined,
            postcode:   initialPostcode ?? formData.fullAddress,
            location:   formData.fullAddress,
            latitude:   formData.locationCoords?.lat ?? null,
            longitude:  formData.locationCoords?.lon ?? null,
            jobData:    guestJobData,
          }),
        })

        const guestBody = await guestRes.json().catch(() => ({}))

        if (!guestRes.ok) {
          clearTimeout(timeoutId)
          if (guestBody?.error === "email_exists") {
            setErr("An account with this email already exists. Please sign in instead.")
          } else {
            setErr(guestBody?.error ?? "Failed to create account. Please try again.")
          }
          setLoading(false)
          return
        }

        // Sign in so the user has a session
        await supabase.auth.signInWithPassword({ email: contactData.email.trim().toLowerCase(), password: contactData.password })

        clearTimeout(timeoutId)
        setLoading(false)

        const urgencyType = guestBody.urgencyType
        if (urgencyType === "flexible") {
          router.push(`/dashboard/homeowner/jobs?posted=${jobId}`)
        } else {
          const ttlMs = urgencyType === "asap" ? 60 * 60 * 1000 : 3 * 60 * 60 * 1000
          setActiveSearch({
            jobId,
            jobTitle: formData.service || formData.industry || "Job",
            tradesCount: 0, notifiedCount: 0, phase: "searching",
            startedAt: Date.now(), expiresAt: Date.now() + ttlMs,
            userId: "",
          })
          router.push(`/jobs/${jobId}/live`)
        }
        return
      }

      // ── Authenticated user flow ───────────────────────────────────────────────
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

      // Upload job photo if provided
      let jobPhotoPublicUrl: string | null = null
      if (formData.jobPhoto && formData.postingType === "tradespeople") {
        try {
          const fileName = `${user.id}/${Date.now()}.jpg`

          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(fileName, formData.jobPhoto, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            })

          if (uploadError) {
            console.error("[JOB PHOTO UPLOAD ERROR]", {
              message: uploadError.message,
              bucket: "job-photos",
              fileName,
            })
          } else {
            const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName)
            jobPhotoPublicUrl = urlData.publicUrl
            console.log("[JOB PHOTO UPLOAD OK] url:", jobPhotoPublicUrl)
          }
        } catch (err: any) {
          console.error("[JOB PHOTO UPLOAD EXCEPTION]", err?.message ?? err)
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
          ? INDUSTRY_TO_CATEGORY[formData.industry] ?? formData.industry ?? PROFESSION_TO_CATEGORY[formData.profession.trim()] ?? null
          : null,
        location: formData.fullAddress,
        address_full: formData.locationAddressType === 'exact' ? (formData.fullAddress || null) : null,
        postcode: extractPostcode(formData.fullAddress),
        location_type: formData.locationAddressType,
        latitude: formData.locationCoords?.lat ?? companyProfile?.latitude ?? null,
        longitude: formData.locationCoords?.lon ?? companyProfile?.longitude ?? null,
        work_location: "onsite",
        description: fullDescription,
        short_description: formData.shortDescription,
        country: "United Kingdom",
        is_tradespeople_job: formData.postingType === "tradespeople",
        // Flexible jobs use classic marketplace (no dispatch, no 15-min window, no reliability penalties)
        is_urgent: formData.postingType === "tradespeople" && formData.urgencyType !== "flexible",
        urgency_type: formData.postingType === "tradespeople" ? (formData.urgencyType || null) : null,
        deadline_at: formData.postingType === "tradespeople" ? expirationDate.toISOString() : null,
        // Uber-style job matching fields for trade jobs
        search_state: formData.postingType === "tradespeople" && formData.urgencyType === "asap" ? "active_search" : null,
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
        preferred_language: locale ?? 'en',
        status: "POSTED",
        is_active: true,
        expires_at: expirationDate.toISOString(),
        created_at: new Date().toISOString(),
      }

      // Add photo URL if uploaded
      if (jobPhotoPublicUrl) {
        payload.job_photo_url = jobPhotoPublicUrl
      }
      console.log("[JOB PAYLOAD] job_photo_url:", payload.job_photo_url ?? "NOT SET")

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

        if (formData.urgencyType === "flexible") {
          // Flexible: push + in-app to all matching AVAILABLE tradespeople in radius
          fetch(`/api/jobs/${jobId}/dispatch-flexible`, { method: "POST" }).catch(() => {})
        } else {
          // Urgent (ASAP / Today): in-app + email to matched companies
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

          // Uber-style radius dispatch for urgent jobs (asap only from wizard)
          if (formData.urgencyType === "asap") {
            fetch(`/api/jobs/${jobId}/dispatch-urgent`, { method: "POST" }).catch(() => {})
          }
        }
      }
      // ─────────────────────────────────────────────────────────

      const isFlexible = formData.urgencyType === "flexible"

      if (isFlexible) {
        // Flexible jobs: simple confirmation, then go to My Jobs (active tab)
        setLoading(false)
        router.push(`/dashboard/homeowner/jobs?posted=${jobId}`)
      } else {
        // Urgent (ASAP/Today): Uber-style live tracking
        const ttlMs = formData.urgencyType === "asap" ? 60 * 60 * 1000 : 3 * 60 * 60 * 1000
        setActiveSearch({
          jobId,
          jobTitle: formData.profession.trim() || formData.service || "Job",
          tradesCount:   0,
          notifiedCount: 0,
          phase:         "searching",
          startedAt:     Date.now(),
          expiresAt:     Date.now() + ttlMs,
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
          <div className="space-y-3">
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

            <h3 className="text-base font-semibold text-white">Job / Task Details</h3>

            {/* Industry dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1 text-white">
                Type of trade needed <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                {/* Custom trade picker — larger touch targets than native <select> */}
                <button
                  type="button"
                  onClick={() => { setShowIndustryDropdown((v) => !v); setShowServiceDropdown(false) }}
                  className="w-full flex items-center justify-between border rounded-xl px-4 py-3 shadow-sm bg-slate-700 border-slate-600 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <span className={formData.industry ? "text-white" : "text-slate-400"}>
                    {formData.industry
                      ? `${TRADE_INDUSTRIES.find(i => i.title === formData.industry)?.icon ?? ""} ${formData.industry}`
                      : "Select a trade…"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showIndustryDropdown ? "rotate-180" : ""}`} />
                </button>

                {showIndustryDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-y-auto max-h-[calc(70vh-5rem)]">
                    {TRADE_INDUSTRIES.map((ind) => (
                      <button
                        key={ind.title}
                        type="button"
                        onClick={() => {
                          const hasServices = ind.services.length > 0
                          setFormData((prev) => ({ ...prev, industry: ind.title, service: "" }))
                          setShowIndustryDropdown(false)
                          if (hasServices) setShowServiceDropdown(true)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors border-b border-slate-700/50 last:border-0 ${
                          formData.industry === ind.title
                            ? "bg-emerald-600/20 text-emerald-300"
                            : "text-slate-100 hover:bg-slate-700 active:bg-slate-600"
                        }`}
                      >
                        <span className="text-lg">{ind.icon}</span>
                        <span>{ind.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Service dropdown — only shown when an industry with services is selected */}
            {(() => {
              const selectedInd = TRADE_INDUSTRIES.find(i => i.title === formData.industry)
              if (!selectedInd || selectedInd.services.length === 0) return null
              return (
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">
                    Specific service{" "}
                    <span className="text-slate-400 font-normal text-xs">(recommended)</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowServiceDropdown((v) => !v)}
                      className="w-full flex items-center justify-between border rounded-xl px-4 py-3 shadow-sm bg-slate-700 border-slate-600 text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <span className={formData.service ? "text-white" : "text-slate-400"}>
                        {formData.service || "Not sure / Any"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showServiceDropdown ? "rotate-180" : ""}`} />
                    </button>
                    {showServiceDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-y-auto max-h-[calc(70vh-5rem)]">
                        <button
                          type="button"
                          onClick={() => { setFormData((prev) => ({ ...prev, service: "" })); setShowServiceDropdown(false) }}
                          className={`w-full flex items-center px-4 py-2.5 text-left text-sm font-medium transition-colors border-b border-slate-700/50 ${!formData.service ? "bg-emerald-600/20 text-emerald-300" : "text-slate-400 hover:bg-slate-700"}`}
                        >
                          Not sure / Any
                        </button>
                        {selectedInd.services.map((svc) => (
                          <button
                            key={svc}
                            type="button"
                            onClick={() => { setFormData((prev) => ({ ...prev, service: svc })); setShowServiceDropdown(false) }}
                            className={`w-full flex items-center px-4 py-2.5 text-left text-sm font-medium transition-colors border-b border-slate-700/50 last:border-0 ${formData.service === svc ? "bg-emerald-600/20 text-emerald-300" : "text-slate-100 hover:bg-slate-700 active:bg-slate-600"}`}
                          >
                            {svc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Helps match you with tradespeople who specialise in this service
                  </p>
                </div>
              )
            })()}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1 text-white">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                className="w-full h-28 border rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                placeholder="Describe the job (size, problem, location in house)"
                maxLength={1000}
              />
              <p className="text-xs text-slate-500 mt-0.5">{formData.shortDescription.length}/1000</p>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Budget (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Min £</label>
                  <input
                    type="number"
                    value={formData.payMin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMin: e.target.value }))}
                    className="w-full border rounded-xl p-2.5 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Max £</label>
                  <input
                    type="number"
                    value={formData.payMax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, payMax: e.target.value }))}
                    className="w-full border rounded-xl p-2.5 shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium mb-1 text-white">
                Photo <span className="text-slate-500 font-normal text-xs">(optional)</span>
              </label>
              {!formData.jobPhotoUrl ? (
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-3 text-center bg-slate-800/50">
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

            {/* Location privacy — only shown once coords are set */}
            {formData.locationCoords && (
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-2">Location privacy</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-xs ${formData.locationAddressType === 'exact' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                    <input type="radio" name="locationAddressType" className="mt-0.5 accent-emerald-500" checked={formData.locationAddressType === 'exact'} onChange={() => setFormData(p => ({ ...p, locationAddressType: 'exact' }))} />
                    <div>
                      <div className="font-semibold text-white">Exact address</div>
                      <div className="text-slate-400 mt-0.5">Revealed to tradesperson only after job accepted</div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all text-xs ${formData.locationAddressType === 'approx' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                    <input type="radio" name="locationAddressType" className="mt-0.5 accent-blue-500" checked={formData.locationAddressType === 'approx'} onChange={() => setFormData(p => ({ ...p, locationAddressType: 'approx' }))} />
                    <div>
                      <div className="font-semibold text-white">Approximate only</div>
                      <div className="text-slate-400 mt-0.5">Your exact street stays private</div>
                    </div>
                  </label>
                </div>
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
                  <span className="font-medium text-white text-right truncate max-w-[60%]">
                    {formData.postingType === "tradespeople"
                      ? (formData.service && formData.service !== "Not sure / Other" ? formData.service : formData.industry) || formData.profession || "—"
                      : formData.profession || "—"}
                  </span>
                </div>
                {formData.postingType === "tradespeople" && formData.industry && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Category</span>
                    <span className="font-medium text-white text-right truncate max-w-[60%]">{formData.industry}</span>
                  </div>
                )}
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
                    {formData.urgencyType === "asap" ? "ASAP" : formData.urgencyType === "today" ? "Today" : formData.urgencyType === "flexible" ? `Flexible · ${formData.flexibleDays}d` : "—"}
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

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white mb-0.5">Create your account</h3>
              <p className="text-xs text-slate-400">Your job will be posted immediately after sign-up — no email verification required.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">First name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={contactData.firstName}
                    onChange={(e) => setContactData((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Jane"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1 block">Last name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={contactData.lastName}
                    onChange={(e) => setContactData((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Smith"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Email address <span className="text-red-400">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Phone <span className="text-slate-500">(optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={contactData.phone}
                  onChange={(e) => setContactData((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+44 7700 000000"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 mb-1 block">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={contactData.password}
                  onChange={(e) => setContactData((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <button
                  type="button"
                  onClick={() => setContactData((p) => ({ ...p, ageConfirmation: !p.ageConfirmation }))}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${contactData.ageConfirmation ? "bg-emerald-500 border-emerald-500" : "border-slate-600 bg-slate-800"}`}
                >
                  {contactData.ageConfirmation && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  I confirm I am 18 years of age or older <span className="text-red-400">*</span>
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <button
                  type="button"
                  onClick={() => setContactData((p) => ({ ...p, termsAccepted: !p.termsAccepted }))}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${contactData.termsAccepted ? "bg-emerald-500 border-emerald-500" : "border-slate-600 bg-slate-800"}`}
                >
                  {contactData.termsAccepted && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  I agree to the <a href="/terms" target="_blank" className="text-emerald-400 underline underline-offset-2">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-emerald-400 underline underline-offset-2">Privacy Policy</a> <span className="text-red-400">*</span>
                </span>
              </label>
            </div>

            <p className="text-xs text-slate-500 pt-1">
              Already have an account?{" "}
              <a href="/auth/login" className="text-emerald-400 underline underline-offset-2">Sign in</a>
            </p>
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
            <div className="flex-shrink-0 flex items-center justify-between px-4 pt-safe pb-4 md:px-6 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10">
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

            {/* Content + footer inside the scroll area — user must scroll to reach buttons */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-900 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              <div className="p-4 md:p-6">
                {renderStep()}
                {err && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg">{err}</div>}
              </div>

              {/* Navigation buttons — at the bottom of scrollable content */}
              <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-safe md:px-6 border-t border-white/10" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}>
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 px-4 py-2.5 border border-slate-700/80 text-slate-400 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 hover:text-slate-200 transition-all text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-7 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 active:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/25"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-7 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 active:bg-emerald-600 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Publishing…
                      </>
                    ) : (guestMode && currentStep === 4 ? "Create account & post job" : "Publish Job")}
                  </button>
                )}
              </div>

              {/* Spacer so buttons aren't hidden behind the mobile nav bar */}
              <div className="h-20 md:hidden" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
