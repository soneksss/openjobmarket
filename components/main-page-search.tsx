"use client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debug = (...args: any[]) => { if (process.env.NODE_ENV === "development") console.log(...args) }

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LocationInput } from "@/components/location-input"
import { Search, Users, Hammer, Map, X, Target, MapPin, SlidersHorizontal, HardHat, ClipboardList, Building2, UserSearch } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ProfessionalMap } from "@/components/professional-map"
import ProfessionalsPageContent from "@/components/professionals-page-content"
import { MapPreloader } from "@/components/map-preloader"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/client"
import { useTranslation } from "@/lib/i18n/context"
import { getBilingualSearchTerms } from "@/lib/bilingual-search"
import { useSearchType } from "@/lib/contexts/search-type-context"
import { useSearchLocation } from "@/lib/contexts/search-location-context"

const RESULT_LIMIT = 100

// Normalize search_traders RPC result to have the same field names the UI expects.
// UI detects type via "company_name" in item (company) or "first_name" in item (professional),
// so we must only add the relevant key — adding undefined still makes `in` return true.
function normalizeTraderResult(item: any) {
  const isCompany = item.profile_type === "company"
  const base = {
    ...item,
    average_rating:    item.rating ?? item.average_rating,
    reviews_count:     item.reviews_count ?? item.review_count,
    profile_photo_url: item.logo_url,
    coordinates:       { lat: item.latitude, lon: item.longitude },
    type:              item.profile_type,
  }
  if (isCompany) {
    base.company_name = item.name
  } else {
    base.first_name = item.name?.split(" ")[0] || item.name
    base.last_name  = item.name?.split(" ").slice(1).join(" ") || ""
  }
  return base
}

interface MainPageSearchProps {
  onSearchStateChange?: (hasResults: boolean) => void
  externalSearchQuery?: string
  initialUser?: any
  initialUserType?: string | null
  adminSettings?: { vacanciesJobseekersEnabled: boolean }
  profileLocation?: { location: string; latitude: number; longitude: number } | null
}

// Maps a specific trade title to a broader related search term for stage-2 fallback.
// Returns null if no related trade is known (stage 2 will be skipped).
function getRelatedTrade(query: string): string | null {
  const q = (query || '').toLowerCase().trim()
  const map: Record<string, string> = {
    electrician: 'Electrical', 'electrical engineer': 'Electrical',
    plumber: 'Plumbing', 'plumbing engineer': 'Plumbing',
    carpenter: 'Carpentry', joiner: 'Joinery',
    painter: 'Painting', decorator: 'Painting', 'painter and decorator': 'Painting',
    plasterer: 'Plastering & Rendering', roofer: 'Roofing', tiler: 'Tiling',
    bricklayer: 'Bricklaying', builder: 'Construction', 'general builder': 'Construction',
    scaffolder: 'Scaffolding', welder: 'Welding', fabricator: 'Fabrication',
    'gas engineer': 'Gas', 'heating engineer': 'Heating', 'hvac engineer': 'HVAC',
    handyman: 'Maintenance', 'maintenance engineer': 'Maintenance',
    landscaper: 'Landscaping', groundworker: 'Groundworks',
    floorer: 'Flooring', 'flooring fitter': 'Flooring',
    glazier: 'Glazing', insulator: 'Insulation',
  }
  return map[q] ?? null
}

export function MainPageSearch({ onSearchStateChange, externalSearchQuery, initialUser, initialUserType, adminSettings, profileLocation }: MainPageSearchProps = {}) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState<string>("")
  const [searchResultCount, setSearchResultCount] = useState<number>(0)
  const [locationError, setLocationError] = useState("")
  const [user, setUser] = useState<any>(initialUser ?? null)
  const [userType, setUserType] = useState<"professional" | "company" | "contractor" | "homeowner" | null>((initialUserType as any) ?? null)
  const [userProfile, setUserProfile] = useState<any>(null)
  // Default to "traders" (Tradespeople) for unregistered users
  const { searchType: contextSearchType, setSearchType: setContextSearchType } = useSearchType()
  const { setLocation: setContextLocation } = useSearchLocation()
  const [selectedSearchType, setSelectedSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders">(contextSearchType)

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapPickerLocation, setMapPickerLocation] = useState<{ lat: number; lon: number; name: string } | null>(null)
  const [mapPickerRadius, setMapPickerRadius] = useState("10")
  const [mapPickerKey, setMapPickerKey] = useState(0)

  // Filter panel state
  const [showFilters, setShowFilters] = useState(false)

  // Filter values state
  const [jobType, setJobType] = useState("all")
  const [experienceLevel, setExperienceLevel] = useState("all")
  const [workLocation, setWorkLocation] = useState("all")
  const [salaryRange, setSalaryRange] = useState("all")
  const [noExperienceRequired, setNoExperienceRequired] = useState(false)
  const [drivingLicenseRequired, setDrivingLicenseRequired] = useState(false)
  const [ownTransportRequired, setOwnTransportRequired] = useState(false)
  const [tradeCategory, setTradeCategory] = useState("all")
  const [urgency, setUrgency] = useState("all")
  const [budgetRange, setBudgetRange] = useState("all")
  const [tradeJobType, setTradeJobType] = useState("all")
  const [distance, setDistance] = useState("10")
  const [employmentStatus, setEmploymentStatus] = useState("all")
  const [hasCVUploaded, setHasCVUploaded] = useState(false)
  const [hasDrivingLicense, setHasDrivingLicense] = useState(false)
  const [hasOwnTransport, setHasOwnTransport] = useState(false)
  const [willingToRelocate, setWillingToRelocate] = useState(false)
  const [availableForBusiness, setAvailableForBusiness] = useState(false)
  const [spokenLanguage, setSpokenLanguage] = useState("all")

  // Full-screen map modal state for all users.
  // Initialize to true immediately if the URL says autoSearch or returnToSearch — this
  // prevents the home-page widget from flashing before the useEffect fires.
  const [showMapModal, setShowMapModal] = useState(
    () => searchParams?.get('autoSearch') === 'true' || searchParams?.get('returnToSearch') === 'true'
  )
  const [mapResults, setMapResults] = useState<any[]>([])
  // False while the initial auto-search is in flight — modal shows skeleton instead of empty content
  const [initialSearchDone, setInitialSearchDone] = useState(
    () => searchParams?.get('autoSearch') !== 'true' && searchParams?.get('returnToSearch') !== 'true'
  )
  const [searchType, setSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)
  const [modalSearchType, setModalSearchType] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([50.8058, -1.0872])
  const [resultLimitReached, setResultLimitReached] = useState(false)

  // State for restoring search from "Back to Search"
  const [restoreSearch, setRestoreSearch] = useState<"vacancies" | "jobs_tasks" | "talents" | "traders" | null>(null)
  const [isRestoringSearch, setIsRestoringSearch] = useState(false)

  // Search error state for better UX than alert()
  const [searchError, setSearchError] = useState<{ type: 'timeout' | 'network' | 'error' | null; message: string } | null>(null)

  // Cache for signin requirement check (avoid repeated RPC calls)
  const signinRequiredCacheRef = useRef<{ value: boolean | null; timestamp: number } | null>(null)
  const SIGNIN_CACHE_TTL = 60000 // 1 minute cache

  // Periodic refresh for trade jobs map (keeps urgent job list up-to-date)
  const lastModalSearchParamsRef = useRef<any>(null)

  // Admin setting: show/hide vacancies and jobseekers tabs — initialized from server bootstrap
  const [vacanciesJobseekersEnabled, setVacanciesJobseekersEnabled] = useState(
    adminSettings?.vacanciesJobseekersEnabled ?? true
  )

  // Ref to track processed restoration URLs (prevent infinite loop)
  const processedRestorationRef = useRef<string | null>(null)

  // Skills-based auto-search (from nav Jobs button)
  const [autoSearchSkillsLabel, setAutoSearchSkillsLabel] = useState<string | null>(null)
  // Full skills list used as OR conditions in the job query (all user skills, not just first)
  const autoSearchSkillsListRef = useRef<string[]>([])
  // Industry/service-based auto-search (preferred over skills when available)
  const autoSearchIndustryRef  = useRef<string | null>(null)
  const autoSearchServicesRef  = useRef<string[]>([])
  // Multi-stage fallback: 0=initial skill search, 1=related trade, 2=any nearby, 3=all exhausted
  const autoSearchFallbackStageRef = useRef<number>(0)
  const autoSearchOriginalQueryRef = useRef<string>('')
  // No-jobs overlay shown when all fallback stages are exhausted
  const [showNoJobsOverlay, setShowNoJobsOverlay] = useState(false)

  // AbortController to cancel ongoing searches when a new search is triggered
  const searchAbortControllerRef = useRef<AbortController | null>(null)
  // Synchronous in-flight guard — React state updates are async so isSearching can
  // be stale when handleSearch is called twice in rapid succession (e.g. from two
  // useEffect batches). This ref is set/cleared synchronously inside handleSearch.
  const searchInFlightRef = useRef(false)

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])

  // Ref to track if we should skip showing autocomplete (e.g., when query comes from category click)
  const skipAutocompleteRef = useRef(false)

  // Restore modal state when the user returns via the Back button from a job detail page
  useEffect(() => {
    try {
      if (sessionStorage.getItem('ojm_returning') !== '1') return
      sessionStorage.removeItem('ojm_returning')
      const raw = sessionStorage.getItem('ojm_modal_state')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!saved || Date.now() - saved.savedAt > 10 * 60 * 1000) return // ignore if > 10 min old
      setMapResults(saved.mapResults || [])
      setMapCenter(saved.mapCenter || [50.8058, -1.0872])
      setModalSearchType(saved.modalSearchType || null)
      setShowMapModal(true)
      setInitialSearchDone(true)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist modal state to sessionStorage whenever it is open with results
  useEffect(() => {
    if (!showMapModal || mapResults.length === 0) return
    try {
      sessionStorage.setItem('ojm_modal_state', JSON.stringify({
        mapResults,
        mapCenter,
        modalSearchType,
        savedAt: Date.now(),
      }))
    } catch {}
  }, [showMapModal, mapResults, mapCenter, modalSearchType])


  // Redirect to valid tab if current tab is hidden
  useEffect(() => {
    if (!vacanciesJobseekersEnabled && (selectedSearchType === 'vacancies' || selectedSearchType === 'talents')) {
      setSelectedSearchType('traders')
      setContextSearchType('traders')
    }
  }, [vacanciesJobseekersEnabled, selectedSearchType, setContextSearchType])


  // Get suggestions - unified list for all search types
  const getSuggestions = (): string[] => {
    const isPtBR = locale === 'pt-BR'

    if (isPtBR) {
      return [
        // Empregos Profissionais & Escritório
        "Engenheiro de Software", "Desenvolvedor Web", "Desenvolvedor Frontend", "Desenvolvedor Backend", "Desenvolvedor Full Stack",
        "Desenvolvedor Mobile", "Engenheiro DevOps", "Cientista de Dados", "Engenheiro de Machine Learning",
        "Gerente de Projetos", "Gerente de Produto", "Scrum Master", "Analista de Negócios", "Product Owner",
        "Gerente de Marketing", "Profissional de Marketing Digital", "Especialista em SEO", "Criador de Conteúdo", "Gerente de Redes Sociais",
        "Designer UX/UI", "Designer Gráfico", "Designer de Produto", "Web Designer",
        "Representante de Vendas", "Gerente de Vendas", "Gerente de Contas", "Customer Success",
        "Contador", "Analista Financeiro", "Gerente Financeiro",
        "Gerente de RH", "Especialista em RH", "Recrutador",
        "Analista de Dados", "Quality Assurance", "Engenheiro de Testes",
        "Engenheiro de Redes", "Administrador de Redes", "Administrador de Banco de Dados", "Suporte de TI", "Analista de Segurança",
        "Consultor Jurídico", "Oficial de Compliance", "Gerente de Riscos",
        "Gerente de Operações", "Gerente de Cadeia de Suprimentos", "Gerente de Armazém", "Coordenador de Logística",
        "Atendimento ao Cliente", "Assistente Administrativo", "Engenheiro de Suporte",
        "Redator de Conteúdo", "Copywriter", "Redator Técnico", "Editor de Vídeo", "Fotógrafo",
        "Professor", "Enfermeiro", "Farmacêutico", "Fisioterapeuta",

        // Ofícios & Construção
        "Encanador", "Encanamento", "Encanador de Emergência", "Engenheiro de Gás", "Engenheiro de Aquecimento", "Instalador de Caldeiras",
        "Eletricista", "Trabalho Elétrico", "Refiação", "Atualização de Quadro de Distribuição",
        "Carpinteiro", "Carpintaria", "Instalador de Cozinhas", "Marceneiro",
        "Construtor", "Gerente de Construção", "Construtor Geral", "Gerente de Obra",
        "Pedreiro", "Alvenaria", "Trabalhador de Fundações",
        "Gesseiro", "Gesso", "Especialista em Reboco",
        "Pintor", "Pintor & Decorador", "Pintura & Decoração", "Decorador",
        "Telhador", "Telhado", "Reparo de Telhado", "Calhas",
        "Azulejista", "Azulejamento", "Instalador de Banheiros", "Instalação de Banheiros",
        "Especialista em Pisos", "Pisos", "Instalador de Carpetes",
        "Instalador de Janelas", "Instalação de Janelas", "Instalação de Portas", "Vidraceiro",
        "Instalador de Cozinhas", "Instalação de Cozinhas",
        "Paisagista", "Jardineiro", "Paisagismo de Jardim", "Cirurgião de Árvores", "Cirurgia de Árvores",
        "Pavimentação", "Empreiteiro de Pavimentação", "Deck",
        "Cercas", "Empreiteiro de Cercas",
        "Faz-Tudo", "Manutenção Geral",
        "Chaveiro", "Especialista em Segurança",
        "Instalador de CCTV", "Instalação de CCTV", "Engenheiro de Alarmes", "Sistema de Alarme",
        "Especialista em Drenagem", "Trabalho de Drenagem", "Dreno Entupido",
        "Impermeabilização", "Isolamento contra Umidade",
        "Andaimeiro", "Andaimes",
        "Arquiteto", "Agrimensor", "Designer de Interiores", "Engenheiro Estrutural",
        "Engenheiro Civil", "Engenheiro Mecânico", "Engenheiro Elétrico",
        "Oficial de Saúde e Segurança",
        "Instalador de Painéis Solares", "Painéis Solares", "Energia Renovável", "Ar Condicionado",
        "Conservatório", "Conversão de Sótão", "Construção de Extensão", "Conversão de Garagem",

        // Outros Ofícios & Serviços
        "Mecânico", "Eletricista Automotivo", "Técnico de Veículos",
        "Operador de Armazém", "Motorista", "Motorista de Entrega", "Motorista de Caminhão",
        "Faxineiro", "Serviços de Limpeza", "Limpeza Profunda",
        "Controle de Pragas", "Exterminador"
      ]
    }

    return [
      // Professional & Office Jobs
      "Software Engineer", "Web Developer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
      "Mobile Developer", "DevOps Engineer", "Data Scientist", "Machine Learning Engineer",
      "Project Manager", "Product Manager", "Scrum Master", "Business Analyst", "Product Owner",
      "Marketing Manager", "Digital Marketer", "SEO Specialist", "Content Creator", "Social Media Manager",
      "UX/UI Designer", "Graphic Designer", "Product Designer", "Web Designer",
      "Sales Representative", "Sales Manager", "Account Manager", "Customer Success",
      "Accountant", "Financial Analyst", "Finance Manager",
      "HR Manager", "HR Specialist", "Recruiter",
      "Data Analyst", "Quality Assurance", "Test Engineer",
      "Network Engineer", "Network Administrator", "Database Administrator", "IT Support", "Security Analyst",
      "Legal Advisor", "Compliance Officer", "Risk Manager",
      "Operations Manager", "Supply Chain Manager", "Warehouse Manager", "Logistics Coordinator",
      "Customer Service", "Administrative Assistant", "Support Engineer",
      "Content Writer", "Copywriter", "Technical Writer", "Video Editor", "Photographer",
      "Teacher", "Nurse", "Pharmacist", "Physiotherapist",

      // Trades & Construction
      "Plumber", "Plumbing", "Emergency Plumber", "Gas Engineer", "Heating Engineer", "Boiler Installer",
      "Electrician", "Electrical Work", "Rewiring", "Consumer Unit Upgrade",
      "Carpenter", "Carpentry", "Kitchen Fitter", "Joiner",
      "Builder", "Construction Manager", "General Builder", "Site Manager",
      "Bricklayer", "Bricklaying", "Groundworker",
      "Plasterer", "Plastering", "Rendering Specialist",
      "Painter", "Painter & Decorator", "Painting & Decorating", "Decorator",
      "Roofer", "Roofing", "Roofing Repair", "Guttering",
      "Tiler", "Tiling", "Bathroom Fitter", "Bathroom Installation",
      "Flooring Specialist", "Flooring", "Carpet Fitter",
      "Window Fitter", "Window Installation", "Door Installation", "Glazier",
      "Kitchen Fitter", "Kitchen Installation",
      "Landscaper", "Gardener", "Garden Landscaping", "Tree Surgeon", "Tree Surgery",
      "Paving", "Paving Contractor", "Decking",
      "Fencing", "Fencing Contractor",
      "Handyman", "General Maintenance",
      "Locksmith", "Security Specialist",
      "CCTV Installer", "CCTV Installation", "Alarm Engineer", "Alarm System",
      "Drainage Specialist", "Drainage Work", "Blocked Drain",
      "Damp Proofing", "Waterproofing",
      "Scaffolder", "Scaffolding",
      "Architect", "Surveyor", "Interior Designer", "Structural Engineer",
      "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
      "Health & Safety Officer",
      "Solar Panel Installer", "Solar Panels", "Renewable Energy", "Air Conditioning",
      "Conservatory", "Loft Conversion", "Extension Building", "Garage Conversion",

      // Other Trades & Services
      "Mechanic", "Auto Electrician", "Vehicle Technician",
      "Warehouse Operative", "Driver", "Delivery Driver", "HGV Driver",
      "Cleaner", "Cleaning Services", "Deep Cleaning",
      "Pest Control", "Exterminator"
    ]
  }

  // Filter suggestions based on search query
  useEffect(() => {
    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false
      setShowSuggestions(false)
      setFilteredSuggestions([])
      return
    }

    if (searchQuery.trim().length >= 1) {
      const suggestions = getSuggestions()
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSuggestions(filtered.slice(0, 8))
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
      setFilteredSuggestions([])
    }
  }, [searchQuery])

  // Update search query from external source (e.g., category clicks)
  useEffect(() => {
    if (externalSearchQuery) {
      // Set flag to skip autocomplete suggestions for this query
      skipAutocompleteRef.current = true
      setSearchQuery(externalSearchQuery)
      // If user clicked a category but hasn't selected a location, automatically open map picker
      if (!selectedLocation) {
        // Dispatch event to hide banners when map picker opens
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('mainPageSearch'))
        }
        setMapPickerKey(prev => prev + 1) // Increment key to force fresh map instance
        setShowMapPicker(true)
      }
    }
  }, [externalSearchQuery, selectedLocation])

  // Check auth state and user type.
  // Skip the network getUser() call when the server already resolved auth via initialUser.
  // onAuthStateChange handles live sign-in/sign-out transitions regardless.
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", user.id)
          .single()

        const fetchedUserType = userData?.user_type || null
        setUserType(fetchedUserType)

        // Set default search type based on user type
        // Companies default to "jobs_tasks" (Trade Jobs) tab; Homeowners default to "traders"
        const tab = searchParams?.get('tab')
        if (fetchedUserType === 'company' && !tab) {
          setSelectedSearchType('jobs_tasks')
          setContextSearchType('jobs_tasks')
        }
        if (fetchedUserType === 'homeowner') {
          setSelectedSearchType('traders')
          setContextSearchType('traders')
        }

        // Fetch the appropriate profile based on user type
        let profileData = null
        if (fetchedUserType === 'professional') {
          const { data } = await supabase
            .from("professional_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", user.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'company') {
          const { data } = await supabase
            .from("company_profiles")
            .select("id, company_name")
            .eq("user_id", user.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'homeowner') {
          const { data } = await supabase
            .from("homeowner_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", user.id)
            .maybeSingle()
          profileData = data
        }

        setUserProfile(profileData)
      } else {
        setUserType(null)
        setUserProfile(null)
      }
    }
    // Only call getUser() (network) when server did not provide auth state
    if (!initialUser) checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", session.user.id)
          .single()

        const fetchedUserType = userData?.user_type || null
        setUserType(fetchedUserType)

        // Set default search type based on user type on auth change
        const tab = searchParams?.get('tab')
        if (fetchedUserType === 'company' && !tab) {
          setSelectedSearchType('jobs_tasks')
          setContextSearchType('jobs_tasks')
        }
        if (fetchedUserType === 'homeowner') {
          setSelectedSearchType('traders')
          setContextSearchType('traders')
        }

        // Fetch the appropriate profile based on user type
        let profileData = null
        if (fetchedUserType === 'professional') {
          const { data } = await supabase
            .from("professional_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", session.user.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'company') {
          const { data } = await supabase
            .from("company_profiles")
            .select("id, company_name")
            .eq("user_id", session.user.id)
            .maybeSingle()
          profileData = data
        } else if (fetchedUserType === 'homeowner') {
          const { data } = await supabase
            .from("homeowner_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", session.user.id)
            .maybeSingle()
          profileData = data
        }

        setUserProfile(profileData)
      } else {
        setUserType(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Handle tab URL parameter and restore search state from "Back to Search"
  useEffect(() => {
    const tab = searchParams?.get('tab')
    const returnToSearch = searchParams?.get('returnToSearch')

    // PRIORITY: Check returnToSearch flag (single source of truth)
    if (returnToSearch === 'true') {
      const urlSignature = searchParams?.toString() || ''

      if (processedRestorationRef.current === urlSignature) {
        return
      }

      debug("[MAIN-PAGE-SEARCH] returnToSearch detected")
      processedRestorationRef.current = urlSignature
      setIsRestoringSearch(true)

      // Read return params (allow partial - use whatever is available)
      const returnQuery = searchParams?.get('returnQuery')
      const returnLocation = searchParams?.get('returnLocation')
      const returnLat = searchParams?.get('returnLat')
      const returnLon = searchParams?.get('returnLon')
      const returnRadius = searchParams?.get('returnRadius')

      // Restore whatever params are available
      if (returnQuery) setSearchQuery(returnQuery)
      if (returnLocation) setLocation(returnLocation)
      if (returnLat && returnLon) {
        setSelectedLocation({
          lat: parseFloat(returnLat),
          lon: parseFloat(returnLon)
        })
      }
      if (returnRadius) setDistance(returnRadius)

      // Determine search type from tab or default to vacancies
      const searchType = tab || 'vacancies'
      if (searchType === 'vacancies' || searchType === 'jobs_tasks' || searchType === 'talents' || searchType === 'traders') {
        setSelectedSearchType(searchType)
      }

      setShowMapModal(true)

      // Trigger search restoration (even with partial params)
      setRestoreSearch(searchType)

      return // Exit early - restoration takes priority
    } else {
      // If returnToSearch is not present, clear the processed ref
      // This allows new restorations after user performs a new search
      processedRestorationRef.current = null
    }

    // Handle autoSearch from dashboard navigation (e.g., Trade Jobs button)
    const autoSearch = searchParams?.get('autoSearch')
    if (autoSearch === 'true') {
      // Always close filters when the Jobs nav button is used (even on dedup skip)
      setShowFilters(false)

      const urlSignature = `autoSearch:${searchParams?.toString() || ''}`

      // Check if we've already processed this exact URL
      if (processedRestorationRef.current === urlSignature) {
        debug("[MAIN-PAGE-SEARCH] ⏭️ AutoSearch already processed - skipping")
        return
      }

      debug("[MAIN-PAGE-SEARCH] 🚀 autoSearch=true detected from dashboard")
      processedRestorationRef.current = urlSignature

      // Read search params from dashboard
      const searchParam  = searchParams?.get('search')
      const skillsParam  = searchParams?.get('skills')
      const industryParam  = searchParams?.get('industry')
      const servicesParam  = searchParams?.get('services')
      const locationParam = searchParams?.get('location')
      const latParam = searchParams?.get('lat')
      const lngParam = searchParams?.get('lng')
      const radiusParam = searchParams?.get('radius')
      const languageParam = searchParams?.get('language')
      const is24_7Param = searchParams?.get('24_7')
      const urgencyParam = searchParams?.get('urgency')
      const categoryParam = searchParams?.get('category')

      // Set the search state — industry/services matching takes priority over legacy skills
      if (industryParam) {
        // Industry + service exact matching (preferred)
        const servicesList = servicesParam ? servicesParam.split(',').map(s => s.trim()).filter(Boolean) : []
        setSearchQuery("")
        autoSearchIndustryRef.current  = industryParam
        autoSearchServicesRef.current  = servicesList
        autoSearchSkillsListRef.current = []
        const label = servicesList.length > 0
          ? `${industryParam} › ${servicesList.slice(0, 2).join(', ')}${servicesList.length > 2 ? ` +${servicesList.length - 2}` : ''}`
          : industryParam
        setAutoSearchSkillsLabel(label)
        autoSearchFallbackStageRef.current = 0
        autoSearchOriginalQueryRef.current = industryParam
        setShowNoJobsOverlay(false)
      } else if (skillsParam) {
        // Legacy skills-based OR ilike matching
        const skillsList = skillsParam.split(',').map(s => s.trim()).filter(Boolean)
        if (skillsList.length > 0) {
          setSearchQuery("")
          autoSearchIndustryRef.current  = null
          autoSearchServicesRef.current  = []
          autoSearchSkillsListRef.current = skillsList
          setAutoSearchSkillsLabel(skillsList.slice(0, 3).join(', ') + (skillsList.length > 3 ? ` +${skillsList.length - 3} more` : ''))
          autoSearchFallbackStageRef.current = 0
          autoSearchOriginalQueryRef.current = skillsList[0]
          setShowNoJobsOverlay(false)
        }
      } else if (searchParam) {
        setSearchQuery(searchParam)
        autoSearchIndustryRef.current  = null
        autoSearchServicesRef.current  = []
        autoSearchSkillsListRef.current = []
        setAutoSearchSkillsLabel(null)
        autoSearchFallbackStageRef.current = 0
        autoSearchOriginalQueryRef.current = searchParam
        setShowNoJobsOverlay(false)
      }
      if (locationParam) setLocation(locationParam)
      if (latParam && lngParam) {
        setSelectedLocation({
          lat: parseFloat(latParam),
          lon: parseFloat(lngParam)
        })
      }
      if (radiusParam) setDistance(radiusParam)
      if (languageParam) setSpokenLanguage(languageParam)
      if (urgencyParam) setUrgency(urgencyParam)
      if (categoryParam) setTradeCategory(categoryParam)
      if (is24_7Param === 'true') setAvailableForBusiness(true)

      // Set search type from tab
      if (tab === 'vacancies' || tab === 'jobs_tasks' || tab === 'talents' || tab === 'traders') {
        setSelectedSearchType(tab)
        setContextSearchType(tab)
      }

      // Check if we should open map or filters specifically
      const openFiltersParam = searchParams?.get('openFilters')

      // If openFilters=true, show filter panel; otherwise always start with filters CLOSED
      if (openFiltersParam === 'true') {
        setShowFilters(true)
      } else {
        setShowFilters(false)
      }

      // Open the map modal immediately for autoSearch — user should see the map, not the search card.
      // The modal renders with empty data while the search runs, then updates when results arrive.
      setShowMapModal(true)

      // Trigger search after state is set.
      // For jobs_tasks: always prefer browser geolocation (actual current position)
      // over profile coordinates. Profile coords (from URL) are used as fallback
      // only if geolocation is denied or unavailable.
      const searchTypeToUse = (tab === 'vacancies' || tab === 'jobs_tasks' || tab === 'talents' || tab === 'traders') ? tab : 'jobs_tasks'

      // Portsmouth fallback coords (used when no location is known)
      const PORTSMOUTH = { lat: 50.8058, lon: -1.0872 }

      if (latParam && lngParam) {
        // Profile coords in URL — always use them (registered business location takes priority)
        setSelectedLocation({ lat: parseFloat(latParam), lon: parseFloat(lngParam) })
        setLocation(locationParam || "")
        setDistance(radiusParam || "10")
        setRestoreSearch(searchTypeToUse)
      } else if (tab === 'traders') {
        // Live Map opened — centre on profile location, fall back to Portsmouth + 5mi
        if (profileLocation?.latitude && profileLocation?.longitude) {
          setSelectedLocation({ lat: profileLocation.latitude, lon: profileLocation.longitude })
          setLocation(profileLocation.location || "Your area")
          setDistance(radiusParam || "10")
        } else {
          setSelectedLocation(PORTSMOUTH)
          setLocation("Portsmouth, UK")
          setDistance("5")
        }
        setRestoreSearch(searchTypeToUse)
      } else if (tab === 'jobs_tasks' && typeof navigator !== 'undefined' && navigator.geolocation) {
        // No profile coords — try browser geolocation as fallback
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSelectedLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
            setLocation("Near you")
            setDistance(radiusParam || "25")
            setRestoreSearch(searchTypeToUse)
          },
          () => {
            // Denied / unavailable — UK-wide fallback
            setSelectedLocation({ lat: 52.3555, lon: -1.1743 })
            setLocation("United Kingdom")
            setDistance("150")
            setRestoreSearch(searchTypeToUse)
          },
          { timeout: 5000, maximumAge: 60000 }
        )
      } else {
        // No coords at all — UK-wide fallback
        setSelectedLocation({ lat: 52.3555, lon: -1.1743 })
        setLocation(locationParam || "United Kingdom")
        setDistance("150")
        setRestoreSearch(searchTypeToUse)
      }

      return
    }

    // Fallback: Old tab-based logic (if no returnToSearch flag)
    if (tab) {
      if (tab === 'vacancies' || tab === 'jobs_tasks' || tab === 'talents' || tab === 'traders') {
        setSelectedSearchType(tab)
      }
    }
  }, [searchParams])

  // Separate effect to trigger search after state restoration
  useEffect(() => {
    if (restoreSearch) {
      // Allow restoration with partial params (at minimum, we need location coordinates)
      if (selectedLocation) {
        handleSearch(restoreSearch)
        setRestoreSearch(null)
        setTimeout(() => setIsRestoringSearch(false), 2000)
      }
    }
  // Only re-run when restoreSearch or selectedLocation changes.
  // searchQuery/location are read from current state inside the effect (set in same batch).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreSearch, selectedLocation])

  // Utility function to format address in short format
  const formatShortAddress = (suggestion: any): string => {
    if (!suggestion.address) {
      return suggestion.display_name
    }

    const parts: string[] = []
    const addr = suggestion.address

    // Add street (road + house number)
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`)
    } else if (addr.road) {
      parts.push(addr.road)
    }

    // Add town/city
    const locality = addr.city || addr.town || addr.village || addr.suburb
    if (locality) {
      parts.push(locality)
    }

    // Add postcode
    if (addr.postcode) {
      parts.push(addr.postcode)
    }

    // Add country
    if (addr.country) {
      parts.push(addr.country)
    }

    return parts.length > 0 ? parts.join(", ") : suggestion.display_name
  }

  useEffect(() => {
    const extractLocationFromQuery = async (query: string) => {
      const locationPatterns = [/\bin\s+([a-zA-Z\s,]+)$/i, /\bat\s+([a-zA-Z\s,]+)$/i, /,\s*([a-zA-Z\s,]+)$/i]

      for (const pattern of locationPatterns) {
        const match = query.match(pattern)
        if (match) {
          const extractedLocation = match[1].trim()
          if (extractedLocation.length > 2 && !location && !selectedLocation) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(extractedLocation)}&limit=1&countrycodes=gb,us,de,fr&addressdetails=1`,
              )
              const data = await response.json()
              if (data.length > 0) {
                const suggestion = data[0]
                const shortAddress = formatShortAddress(suggestion)
                setLocation(shortAddress)
                setSelectedLocation({
                  lat: Number.parseFloat(suggestion.lat),
                  lon: Number.parseFloat(suggestion.lon),
                })
                setSearchQuery(query.replace(pattern, "").trim())
              }
            } catch (error) {
              console.error("Auto location extraction failed:", error)
            }
          }
          break
        }
      }
    }

    if (searchQuery && !location && !selectedLocation) {
      extractLocationFromQuery(searchQuery)
    }
  }, [searchQuery]) // Removed location and selectedLocation from dependencies to prevent infinite loop

  const handleLocationSelect = (locationName: string, lat: number, lon: number) => {
    setLocation(locationName)
    setSelectedLocation({ lat, lon })
    setLocationError("")
    // Update context for JobsNearYou component
    setContextLocation({ lat, lon, name: locationName })
  }

  // Haversine distance calculation (returns distance in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Filter results by actual circular radius (not just bounding box)
  const filterByRadius = <T extends { latitude?: number | null; longitude?: number | null }>(
    items: T[],
    centerLat: number,
    centerLon: number,
    radiusMiles: number
  ): T[] => {
    const radiusKm = radiusMiles * 1.60934
    return items.filter(item => {
      if (!item.latitude || !item.longitude) return false
      const distance = calculateDistance(centerLat, centerLon, item.latitude, item.longitude)
      const withinRadius = distance <= radiusKm
      return withinRadius
    })
  }

  // Cancel any ongoing search - used when switching search type tabs
  const cancelOngoingSearch = () => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
      searchAbortControllerRef.current = null
    }
    searchInFlightRef.current = false
    if (isSearching) {
      setIsSearching(false)
      setSearchProgress("")
    }
  }

  // Handler for switching search type tabs
  const handleSearchTypeChange = (type: "vacancies" | "jobs_tasks" | "talents" | "traders") => {
    if (type !== selectedSearchType) {
      cancelOngoingSearch()
      setSelectedSearchType(type)
      setContextSearchType(type) // Update context for page background
    }
  }

  const validateSearch = () => {
    const hasVacancyFilters = jobType !== "all" || experienceLevel !== "all" || workLocation !== "all" ||
                              salaryRange !== "all" || noExperienceRequired || drivingLicenseRequired || ownTransportRequired
    const hasTradeJobFilters = tradeCategory !== "all" || urgency !== "all" || budgetRange !== "all" || tradeJobType !== "all"
    const hasTraderFilters = tradeCategory !== "all" || availableForBusiness
    const hasTalentFilters = experienceLevel !== "all" || employmentStatus !== "all" || hasCVUploaded ||
                             hasDrivingLicense || hasOwnTransport || willingToRelocate

    const canSkipSearchQuery =
      (selectedSearchType === "vacancies" && (hasVacancyFilters || selectedLocation)) ||
      (selectedSearchType === "jobs_tasks" && (hasTradeJobFilters || selectedLocation)) ||
      (selectedSearchType === "traders" && (hasTraderFilters || selectedLocation)) ||
      (selectedSearchType === "talents" && (hasTalentFilters || selectedLocation))

    if (!searchQuery.trim() && !canSkipSearchQuery) {
      return t('mainSearch.enterSearchTerm')
    }

    const canSkipLocation =
      (selectedSearchType === "vacancies" && workLocation === "remote") ||
      (selectedSearchType === "jobs_tasks" && workLocation === "remote") ||
      (selectedSearchType === "talents" && distance === "remote")

    if (!location.trim() && !canSkipLocation) {
      return t('mainSearch.selectLocation')
    }
    if (!selectedLocation && !canSkipLocation) {
      setLocationError(t('mainSearch.selectValidLocation'))
      return t('mainSearch.selectValidLocation')
    }
    return null
  }

  const handleSearch = async (type: "vacancies" | "jobs_tasks" | "talents" | "traders") => {
    const effectiveDistance = distance

    debug(`[SEARCH] start type=${type} radius=${effectiveDistance}`)

    if (searchInFlightRef.current || isSearching) {
      return
    }
    searchInFlightRef.current = true

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
      searchAbortControllerRef.current = null
    }

    searchAbortControllerRef.current = new AbortController()

    if (isRestoringSearch) {
      // skip auth — restoration in progress
    } else if (user) {
      // skip auth — already logged in
    } else {
      // Check if sign-in is required to search (with caching and timeout)
      try {
        // Check cache first
        const now = Date.now()
        if (signinRequiredCacheRef.current && (now - signinRequiredCacheRef.current.timestamp) < SIGNIN_CACHE_TTL) {

          if (signinRequiredCacheRef.current.value && !user) {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
            const isOnBrRoute = pathname?.startsWith('/br')
            const signUpUrl = isOnBrRoute
              ? `/auth/sign-up?locale=pt-BR&redirect=${returnUrl}`
              : `/auth/sign-up?redirect=${returnUrl}`
            router.push(signUpUrl)
            return
          }
        } else {


          // Create a timeout promise that resolves after 2 seconds (reduced from 3s)
          const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
            setTimeout(() => {
              console.warn('[MAIN-PAGE-SEARCH] RPC timeout after 2 seconds - continuing without check')
              resolve({ data: null, error: new Error('RPC timeout') })
            }, 2000)
          })

          // Race between the RPC call and timeout
          const rpcPromise = supabase.rpc('is_signin_required_to_search')
          const result = await Promise.race([rpcPromise, timeoutPromise])
          const { data: signinRequired, error: signinError } = result

          if (signinError) {
            // On error/timeout, cache as "not required" to avoid repeated failures
            console.warn('[MAIN-PAGE-SEARCH] RPC failed, caching as not required:', signinError.message)
            signinRequiredCacheRef.current = { value: false, timestamp: now }
            // Continue with search (fail open for better UX)
          } else {
            // Cache the result
            signinRequiredCacheRef.current = { value: signinRequired, timestamp: now }

            if (signinRequired && !user) {
              debug('[MAIN-PAGE-SEARCH] Sign-in required but user not logged in. Redirecting...')
              const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
              const isOnBrRoute = pathname?.startsWith('/br')
              const signUpUrl = isOnBrRoute
                ? `/auth/sign-up?locale=pt-BR&redirect=${returnUrl}`
                : `/auth/sign-up?redirect=${returnUrl}`
              router.push(signUpUrl)
              return
            }
          }
        }
      } catch (err) {
        console.error('[MAIN-PAGE-SEARCH] Exception checking signin requirement:', err)
        // Continue with search on error (fail open for better UX)
      }
    }

    const error = validateSearch()
    if (error) {
      searchInFlightRef.current = false
      return
    }
    setIsSearching(true)
    setSearchProgress("Initializing search...")
    setSearchResultCount(0)
    setResultLimitReached(false) // Reset limit warning
    setSearchError(null) // Clear any previous error
    setModalSearchType(type)

    try {
      let results: any[] = []

      // Get radius value in miles
      const radiusMiles = parseInt(effectiveDistance) || 10

      if (type === "traders") {
        setSearchProgress("Searching for traders and contractors...")

        const rpcLat    = selectedLocation?.lat ?? mapCenter[0]
        const rpcLon    = selectedLocation?.lon ?? mapCenter[1]
        const rpcRadius = parseInt(effectiveDistance) || 25
        const rpcSearch = searchQuery.trim() || null
        const rpcLang   = (spokenLanguage && spokenLanguage !== "all") ? spokenLanguage : null

        let rpcData: any[] = []
        try {
          const rpcResult = await Promise.race([
            supabase.rpc("search_traders", {
              p_lat:          rpcLat,
              p_lon:          rpcLon,
              p_radius_miles: rpcRadius,
              p_search:       rpcSearch,
              p_language:     rpcLang,
              p_limit:        RESULT_LIMIT + 1,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("QUERY_TIMEOUT")), 8000)
            ),
          ])
          if (rpcResult.error) {
            console.warn("[MAIN-PAGE-SEARCH] search_traders RPC error:", rpcResult.error)
          } else {
            rpcData = rpcResult.data ?? []
          }
        } catch (err: any) {
          console.warn("[MAIN-PAGE-SEARCH] search_traders failed:", err.message)
        }

        // Client-side radius precision filter
        if (selectedLocation) {
          rpcData = filterByRadius(rpcData, selectedLocation.lat, selectedLocation.lon, rpcRadius)
        }

        results = rpcData.map((item: any) => normalizeTraderResult(item))
        debug(`[SEARCH] traders: ${results.length}`)
        setSearchProgress(`Found ${results.length} traders...`)
        setSearchResultCount(results.length)

        // ── legacy block kept for reference but now skipped ───────────────
        if (false) { // eslint-disable-line no-constant-condition

        // Fetch self-employed professionals as well
        // Use inner join with users table to filter out deleted users (orphaned profiles)
        // Always apply a bounding box — use selectedLocation or fall back to map centre
        const profLat = selectedLocation?.lat ?? mapCenter[0]
        const profLon = selectedLocation?.lon ?? mapCenter[1]
        const profRadiusMiles = parseInt(effectiveDistance) || 25
        const profRadiusKm = profRadiusMiles * 1.60934
        const profLatDelta = profRadiusKm / 111.0
        const profLngDelta = profRadiusKm / (111.0 * Math.cos(profLat * Math.PI / 180))

        // No users!inner join — it caused a full users table scan and 10s timeout
        let profQuery = supabase
          .from("professional_profiles")
          .select("*")
          .eq("profile_visible", true)
          .eq("available_for_work", true)
          .eq("is_self_employed", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .gte("latitude", profLat - profLatDelta)
          .lte("latitude", profLat + profLatDelta)
          .gte("longitude", profLon - profLngDelta)
          .lte("longitude", profLon + profLngDelta)

        if (searchQuery.trim()) {
          const searchTerms = getBilingualSearchTerms(searchQuery.trim())
          const searchTerm = searchQuery.trim().toLowerCase()
          if (searchTerm.includes('builder') || searchTerm.includes('building')) searchTerms.push('construction')
          if (searchTerm.includes('plumber')) searchTerms.push('plumbing', 'heating')
          if (searchTerm.includes('electrician')) searchTerms.push('electrical')
          if (searchTerm.includes('carpenter')) searchTerms.push('carpentry', 'joinery')

          const orConditions = searchTerms.flatMap(term => [
            `first_name.ilike.%${term}%`,
            `last_name.ilike.%${term}%`,
            `title.ilike.%${term}%`
          ]).join(',')
          profQuery = profQuery.or(orConditions)
        }

        if (spokenLanguage && spokenLanguage !== "all") {
          profQuery = profQuery.contains("spoken_languages", [spokenLanguage])
        }

        const PROFESSIONAL_TIMEOUT = 5000

        let profData: any = null

        try {
          const result = await Promise.race([
            profQuery.limit(RESULT_LIMIT + 1),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('QUERY_TIMEOUT')), PROFESSIONAL_TIMEOUT))
          ])
          profData = result.data
          if (result.error) console.warn(`[MAIN-PAGE-SEARCH] Professional query error (non-fatal):`, result.error)
        } catch (err: any) {
          console.warn(`[MAIN-PAGE-SEARCH] Professional query failed (non-fatal):`, err.message)
          profData = []
        }

        if (profData) {
          let filteredProfessionals = profData.filter(item => item.latitude && item.longitude)

          if (selectedLocation) {
            const radiusMiles = parseInt(effectiveDistance) || 10
            filteredProfessionals = filterByRadius(filteredProfessionals, selectedLocation.lat, selectedLocation.lon, radiusMiles)
          }

          if (spokenLanguage && spokenLanguage !== "all") {
            filteredProfessionals = filteredProfessionals.filter(item => {
              const languages = item.spoken_languages || []
              return Array.isArray(languages) && languages.includes(spokenLanguage)
            })
          }

          professionalResults = filteredProfessionals.map(item => ({
            ...item,
            id: item.id,
            name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
            coordinates: {
              lat: item.latitude!,
              lon: item.longitude!
            },
            type: 'professional'
          }))
        }

        // Fetch companies who trade — always apply bounding box using selectedLocation or map centre
        const compLat = selectedLocation?.lat ?? mapCenter[0]
        const compLon = selectedLocation?.lon ?? mapCenter[1]
        const compRadiusMiles = parseInt(effectiveDistance) || 25
        const compRadiusKm = compRadiusMiles * 1.60934
        const compLatDelta = compRadiusKm / 111.0
        const compLngDelta = compRadiusKm / (111.0 * Math.cos(compLat * Math.PI / 180))

        let companyQuery = supabase
          .from("company_profiles")
          .select("*")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .gte("latitude", compLat - compLatDelta)
          .lte("latitude", compLat + compLatDelta)
          .gte("longitude", compLon - compLngDelta)
          .lte("longitude", compLon + compLngDelta)

        if (searchQuery.trim()) {
          const searchTerm = searchQuery.trim().toLowerCase()
          const searchTerms = [searchTerm]
          if (searchTerm.includes('builder') || searchTerm.includes('building')) searchTerms.push('construction')
          if (searchTerm.includes('plumber')) searchTerms.push('plumbing', 'heating')
          if (searchTerm.includes('electrician')) searchTerms.push('electrical')
          if (searchTerm.includes('carpenter')) searchTerms.push('carpentry', 'joinery')

          const orConditions = searchTerms.flatMap(term => [
            `company_name.ilike.%${term}%`,
            `industry.ilike.%${term}%`
          ]).join(',')
          companyQuery = companyQuery.or(orConditions)
        }

        if (spokenLanguage && spokenLanguage !== "all") {
          companyQuery = companyQuery.contains("spoken_languages", [spokenLanguage])
        }

        // Add timeout protection to company query (10 seconds)
        const COMPANY_TIMEOUT = 10000


        let companyData: any = null
        let companyError: any = null

        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('QUERY_TIMEOUT')), COMPANY_TIMEOUT)
          )

          const queryPromise = companyQuery.limit(RESULT_LIMIT + 1)
          const result = await Promise.race([queryPromise, timeoutPromise])
          companyData = result.data
          companyError = result.error
        } catch (err: any) {
          if (err.message === 'QUERY_TIMEOUT') {
            console.error(`[MAIN-PAGE-SEARCH] Company query timed out after ${COMPANY_TIMEOUT/1000}s`)
            companyError = { type: 'timeout', message: 'Query timed out' }
          } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
            console.error(`[MAIN-PAGE-SEARCH] Network error:`, err)
            companyError = { type: 'network', message: err.message }
          } else {
            console.error(`[MAIN-PAGE-SEARCH] Unexpected error:`, err)
            companyError = { message: err.message }
          }
        }

        if (companyError) {
          console.error(`[MAIN-PAGE-SEARCH] Company query error:`, companyError)
          console.error(`[MAIN-PAGE-SEARCH] Company error details:`, {
            code: companyError.code,
            message: companyError.message,
            details: companyError.details,
            hint: companyError.hint
          })
          if (companyError.type === 'timeout' || companyError.message?.includes('timeout')) {
            setSearchError({
              type: 'timeout',
              message: t('mainSearch.searchTimeout') || 'Search is taking longer than expected. Please try narrowing your search or try again.'
            })
            setIsSearching(false)
            setSearchProgress("")
            return
          }
          // Don't return on non-timeout errors - continue with empty company results
          companyData = []
        }

        if (companyData) {
          let filteredCompanies = companyData.filter(item => item.latitude && item.longitude)

          if (selectedLocation) {
            const radiusMiles = parseInt(effectiveDistance) || 10
            filteredCompanies = filterByRadius(filteredCompanies, selectedLocation.lat, selectedLocation.lon, radiusMiles)
          }

          // Client-side services filter for companies
          if (searchQuery.trim() && filteredCompanies.length > 0) {
            const searchTerm = searchQuery.trim().toLowerCase()
            const searchTerms = [searchTerm]

            if (searchTerm.includes('plumber')) searchTerms.push('plumbing', 'heating')
            if (searchTerm.includes('gas')) searchTerms.push('heating', 'boiler')
            if (searchTerm.includes('electrician') || searchTerm.includes('electric')) searchTerms.push('electrical', 'electric')
            if (searchTerm.includes('carpenter')) searchTerms.push('carpentry', 'joinery')

            filteredCompanies = filteredCompanies.filter(company => {
              if (!company.services || !Array.isArray(company.services) || company.services.length === 0) return true
              return searchTerms.some(term =>
                company.services.some((service: string) => service.toLowerCase().includes(term))
              )
            })
          }

          companyResults = filteredCompanies.map(item => ({
            ...item,
            id: item.id,
            name: item.company_name,
            coordinates: {
              lat: item.latitude!,
              lon: item.longitude!
            },
            type: 'company'
          }))
        }

        results = [...professionalResults, ...companyResults]
        setSearchProgress(`Found ${results.length} traders...`)
        setSearchResultCount(results.length)
        } // end if(false) legacy block
      } else if (type === "talents") {
        setSearchProgress("Searching for talented professionals...")
        let query = supabase
          .from("professional_profiles")
          .select("*, users!inner(id)")
          .eq("profile_visible", true)
          .eq("available_for_work", true)

        if (searchQuery.trim()) {
          const searchTerms = getBilingualSearchTerms(searchQuery.trim())

          // Build OR conditions for each search term variant
          const orConditions = searchTerms.flatMap(term => [
            `first_name.ilike.%${term}%`,
            `last_name.ilike.%${term}%`,
            `nickname.ilike.%${term}%`,
            `title.ilike.%${term}%`
          ]).join(',')

          query = query.or(orConditions)
        }

        if (experienceLevel !== "all") {
          query = query.eq("experience_level", experienceLevel)
        }

        if (employmentStatus !== "all") {
          if (employmentStatus === "self-employed") {
            query = query.eq("is_self_employed", true)
          } else {
            query = query.eq("employment_status", employmentStatus)
          }
        }

        if (hasDrivingLicense) {
          query = query.eq("has_driving_licence", true)
        }

        if (hasOwnTransport) {
          query = query.eq("has_own_transport", true)
        }

        if (willingToRelocate) {
          query = query.eq("ready_to_relocate", true)
        }

        if (spokenLanguage && spokenLanguage !== "all") {
          query = query.contains("spoken_languages", [spokenLanguage])
        }

        if (selectedLocation && distance !== "remote") {
          const lat = selectedLocation.lat
          const lon = selectedLocation.lon
          const radiusMiles = parseInt(effectiveDistance) || 10
          const radiusKm = radiusMiles * 1.60934

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))

          // Use individual filters instead of .or() to avoid query hanging
          query = query
            .gte("latitude", lat - latDelta)
            .lte("latitude", lat + latDelta)
            .gte("longitude", lon - lngDelta)
            .lte("longitude", lon + lngDelta)
        }

        // Add specific ordering to help with query performance
        query = query.order('created_at', { ascending: false })

        // Add timeout protection (15s for talents query)
        const queryPromise = query.limit(RESULT_LIMIT + 1)
        const TALENTS_TIMEOUT = 15000

        let data: any = null
        let error: any = null

        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('QUERY_TIMEOUT')), TALENTS_TIMEOUT)
          )

          const result = await Promise.race([queryPromise, timeoutPromise])
          data = result.data
          error = result.error
        } catch (err: any) {
          if (err.message === 'QUERY_TIMEOUT') {
            console.warn(`[MAIN-PAGE-SEARCH] Talents query timed out after ${TALENTS_TIMEOUT/1000}s`)
            error = { type: 'timeout', message: 'Query timed out' }
          } else if (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('DISCONNECTED')) {
            console.warn(`[MAIN-PAGE-SEARCH] Network error:`, err)
            error = { type: 'network', message: 'Network connection issue' }
          } else {
            console.warn(`[MAIN-PAGE-SEARCH] Query failed:`, err)
            error = { type: 'error', message: err.message || 'Unknown error' }
          }
        }

        if (error) {
          console.warn(`[MAIN-PAGE-SEARCH] Error fetching talents:`, error)
          if (error.type === 'timeout' || error.message?.includes('timeout')) {
            setSearchError({
              type: 'timeout',
              message: t('mainSearch.searchTimeout') || 'Search is taking longer than expected. Please try again.'
            })
            return // finally block handles cleanup; do not open modal
          } else if (error.type === 'network') {
            setSearchError({
              type: 'network',
              message: 'Connection issue. Please check your internet and try again.'
            })
          } else {
            setSearchError({
              type: 'error',
              message: t('mainSearch.searchFailed') || 'Search failed. Please try again.'
            })
          }
          return // let finally block handle cleanup
        }

        if (!error && data) {
          let filteredTalents = data.filter(item => item.latitude && item.longitude)

          if (selectedLocation && distance !== "remote") {
            const radiusMiles = parseInt(effectiveDistance) || 10
            filteredTalents = filterByRadius(filteredTalents, selectedLocation.lat, selectedLocation.lon, radiusMiles)
          }

          if (spokenLanguage && spokenLanguage !== "all") {
            filteredTalents = filteredTalents.filter(item => {
              const languages = item.spoken_languages || []
              return Array.isArray(languages) && languages.includes(spokenLanguage)
            })
          }

          results = filteredTalents.map(item => ({
            ...item,
            id: item.id,
            name: !item.hide_personal_name && (item.first_name || item.last_name)
              ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
              : (item.nickname || 'Anonymous'),
            coordinates: {
              lat: item.latitude!,
              lon: item.longitude!
            }
          }))
          debug(`[SEARCH] talents: ${results.length}`)
          setSearchProgress(`Found ${results.length} professionals...`)
          setSearchResultCount(results.length)
        }
      } else if (type === "vacancies" || type === "jobs_tasks") {
        setSearchProgress(type === "jobs_tasks" ? "Searching for trade jobs..." : "Searching for job vacancies...")
        // Fetch jobs - exclude expired ones
        // Vacancies = employee positions (is_tradespeople_job = false)
        // Jobs/Tasks = tradespeople work (is_tradespeople_job = true)

        // Query with profile joins to show poster names
        let query = supabase
          .from("jobs")
          .select(`
            *,
            company_profiles!company_id (
              id,
              company_name,
              location,
              industry,
              logo_url,
              user_id
            ),
            homeowner_profiles!homeowner_id (
              id,
              user_id,
              first_name,
              last_name,
              profile_photo_url,
              average_rating,
              reviews_count
            )
          `)
          .eq("status", "POSTED") // Only show jobs open for applications
          .eq("is_active", true)
          .eq("is_tradespeople_job", type === "jobs_tasks") // true for jobs/tasks, false for vacancies
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

        if (type === "vacancies") {
          if (jobType !== "all") query = query.eq("job_type", jobType)
          if (experienceLevel !== "all") query = query.eq("experience_level", experienceLevel)
          if (workLocation !== "all") query = query.eq("work_location", workLocation)
          if (noExperienceRequired) query = query.eq("no_experience_required", true)
          if (drivingLicenseRequired) {
            query = query.or('requirements.cs.{"Driving License (Full UK)"},requirements.cs.{"Driving License"},requirements.cs.{"Driver\'s License"},requirements.cs.{"Full UK Driving License"}')
          }
          if (ownTransportRequired) {
            query = query.or('requirements.cs.{"Own Vehicle"},requirements.cs.{"Own Transport"},requirements.cs.{"Own Tools/Equipment"}')
          }
          if (salaryRange !== "all") {
            switch (salaryRange) {
              case "0-30k":
                query = query.lte("budget_max", 30000)
                break
              case "30-50k":
                query = query.gte("budget_min", 30000).lte("budget_max", 50000)
                break
              case "50-75k":
                query = query.gte("budget_min", 50000).lte("budget_max", 75000)
                break
              case "75-100k":
                query = query.gte("budget_min", 75000).lte("budget_max", 100000)
                break
              case "100k+":
                query = query.gte("budget_min", 100000)
                break
            }
          }
        }

        if (type === "jobs_tasks") {
          if (tradeCategory !== "all") {
            let industryKeyword = tradeCategory
            if (tradeCategory === "construction") industryKeyword = "Construction"
            if (tradeCategory === "plumbing")     industryKeyword = "Plumbing"
            if (tradeCategory === "electrical")   industryKeyword = "Electrical"
            if (tradeCategory === "carpentry")    industryKeyword = "Construction"
            if (tradeCategory === "painting")     industryKeyword = "Construction"
            if (tradeCategory === "roofing")      industryKeyword = "Construction"
            if (tradeCategory === "landscaping")  industryKeyword = "Landscap"
            query = query.or(`industry.ilike.%${industryKeyword}%,category.ilike.%${industryKeyword}%`)
          }
          if (urgency !== "all") query = query.eq("urgency", urgency)
          if (tradeJobType !== "all") query = query.eq("job_type", tradeJobType)
          if (budgetRange !== "all") {
            switch (budgetRange) {
              case "0-500":
                query = query.lte("budget_max", 500)
                break
              case "500-1k":
                query = query.gte("budget_min", 500).lte("budget_max", 1000)
                break
              case "1k-5k":
                query = query.gte("budget_min", 1000).lte("budget_max", 5000)
                break
              case "5k-10k":
                query = query.gte("budget_min", 5000).lte("budget_max", 10000)
                break
              case "10k+":
                query = query.gte("budget_min", 10000)
                break
            }
          }
        }

        // Server-side bounding box filter: keeps jobs without coordinates (they pass through)
        // AND limits jobs WITH coordinates to a ~4x radius box before precise client-side filtering.
        // This dramatically reduces how many rows are returned, preventing timeouts.
        if (selectedLocation && workLocation !== "remote") {
          const radiusMiles = (parseInt(effectiveDistance) || 10) * 4 // generous 4x multiplier
          const latDelta = radiusMiles / 69
          const lngDelta = radiusMiles / (69 * Math.cos((selectedLocation.lat * Math.PI) / 180))
          const latMin = selectedLocation.lat - latDelta
          const latMax = selectedLocation.lat + latDelta
          const lngMin = selectedLocation.lon - lngDelta
          const lngMax = selectedLocation.lon + lngDelta
          // Include jobs with no coordinates OR jobs within the bounding box
          query = query.or(
            `latitude.is.null,longitude.is.null,and(latitude.gte.${latMin},latitude.lte.${latMax},longitude.gte.${lngMin},longitude.lte.${lngMax})`
          )
        }

        // Industry/service exact matching (takes highest priority)
        const autoIndustry  = autoSearchIndustryRef.current
        const autoServices  = autoSearchServicesRef.current
        const profileSkillsList = autoSearchSkillsListRef.current
        if (autoIndustry) {
          debug(`[MAIN-PAGE-SEARCH] Industry filter: ${autoIndustry}, services: ${autoServices}`)
          // Use ilike with first meaningful keyword so tradesperson profiles with broad industry
          // names (e.g. "Electrical & Electronic Engineering") match simplified job industry names
          // (e.g. "Electrical"). Split on spaces, &, commas; take first word > 3 chars.
          const industryKeyword = autoIndustry.split(/[\s&,/]+/).find(w => w.length > 3) || autoIndustry
          // Also include jobs with no industry set (homeowner-posted jobs often have industry=null)
          query = query.or(`industry.ilike.%${industryKeyword}%,industry.is.null`)
          // Service filter is applied client-side (prevents complex multi-OR server conditions)
        } else if (profileSkillsList.length > 0) {
          // Legacy skills-based OR ilike filter
          debug(`[MAIN-PAGE-SEARCH] Applying skills-based filter for ${profileSkillsList.length} skills`)
          const orConditions = profileSkillsList.flatMap(skill => {
            const t = skill.toLowerCase()
            return [
              `title.ilike.%${t}%`,
              `description.ilike.%${t}%`,
              `category.ilike.%${t}%`,
              `industry.ilike.%${t}%`,
            ]
          }).join(',')
          query = query.or(orConditions)
        } else if (searchQuery.trim()) {

          const searchTerm = searchQuery.trim().toLowerCase()

          // Expand search terms with synonyms and word stems
          const searchTerms = [searchTerm]

          // Building/Construction synonyms
          if (searchTerm.includes('builder') || searchTerm.includes('building')) {
            searchTerms.push('construction', 'contractor')
          }
          if (searchTerm.includes('construction')) {
            searchTerms.push('builder', 'building', 'contractor')
          }

          // Plumbing synonyms and stems
          if (searchTerm.includes('plumb')) {
            searchTerms.push('plumber', 'plumbing', 'heating', 'boiler')
          }

          // Electrical synonyms
          if (searchTerm.includes('electric')) {
            searchTerms.push('electrician', 'electrical', 'wiring')
          }

          // Carpentry synonyms
          if (searchTerm.includes('carpen')) {
            searchTerms.push('carpenter', 'carpentry', 'joinery', 'joiner')
          }

          // Painting synonyms
          if (searchTerm.includes('paint')) {
            searchTerms.push('painter', 'painting', 'decorating', 'decorator')
          }

          // Roofing synonyms
          if (searchTerm.includes('roof')) {
            searchTerms.push('roofing', 'roofer')
          }

          // Gardening/Landscaping synonyms
          if (searchTerm.includes('garden') || searchTerm.includes('landscape')) {
            searchTerms.push('gardening', 'gardener', 'landscaping', 'landscaper')
          }

          // Build OR conditions for all search terms
          const orConditions = searchTerms.flatMap(term => [
            `title.ilike.%${term}%`,
            `description.ilike.%${term}%`,
            `category.ilike.%${term}%`
          ]).join(',')

          query = query.or(orConditions)
        }

        const queryPromise = query.limit(RESULT_LIMIT + 1)
        const QUERY_TIMEOUT = 10000

        let data: any = null
        let error: any = null

        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('QUERY_TIMEOUT')), QUERY_TIMEOUT)
          )

          const result = await Promise.race([queryPromise, timeoutPromise])
          data = result.data
          error = result.error
        } catch (err: any) {
          // Differentiate between timeout and network errors
          if (err.message === 'QUERY_TIMEOUT') {
            console.warn(`[MAIN-PAGE-SEARCH] Query timed out after ${QUERY_TIMEOUT/1000}s`)
            error = { type: 'timeout', message: 'Query timed out' }
          } else if (err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('DISCONNECTED')) {
            console.warn(`[MAIN-PAGE-SEARCH] Network error:`, err)
            error = { type: 'network', message: 'Network connection issue' }
          } else {
            console.warn(`[MAIN-PAGE-SEARCH] Query failed:`, err)
            error = { type: 'error', message: err.message || 'Unknown error' }
          }
        }


        if (error) {
          console.warn(`[MAIN-PAGE-SEARCH] Query error:`, error)
          // Set error state; finally block handles cleanup
          if (error.type === 'timeout' || error.message?.includes('timeout')) {
            setSearchError({
              type: 'timeout',
              message: t('mainSearch.searchTimeout') || 'Search is taking longer than expected. Please try again.'
            })
            return // do not open modal on timeout
          } else if (error.type === 'network') {
            setSearchError({
              type: 'network',
              message: 'Connection issue. Please check your internet and try again.'
            })
          } else {
            setSearchError({
              type: 'error',
              message: t('mainSearch.searchFailed') || 'Search failed. Please try again.'
            })
          }
          return // let finally block handle cleanup; do not open modal on error
        }

        if (!error && data) {
          debug(`[SEARCH] jobs raw: ${data.length}`)
          setSearchProgress(`Processing ${data.length} jobs...`)

          let filteredData = data
          if (selectedLocation && workLocation !== "remote") {
            const radiusMiles = parseInt(effectiveDistance) || 10
            const jobsWithCoordsArray = data.filter((item: any) => item.latitude && item.longitude)
            const jobsWithoutCoordsArray = data.filter((item: any) => !item.latitude || !item.longitude)
            const filteredJobsWithCoords = filterByRadius(jobsWithCoordsArray, selectedLocation.lat, selectedLocation.lon, radiusMiles)
            filteredData = [...filteredJobsWithCoords, ...jobsWithoutCoordsArray]
          }

          // Client-side service filter (avoids complex server-side OR chains that cause timeouts)
          const autoServices = autoSearchServicesRef.current
          if (autoServices.length > 0) {
            filteredData = filteredData.filter((item: any) =>
              !item.service || autoServices.includes(item.service)
            )
          }

          // Enrich jobs with poster information
          // IMPORTANT: Do NOT filter out jobs without coordinates - they should still appear in search results
          results = filteredData.map((job: any) => {
              const homeownerProfile = job.homeowner_profiles
              const companyProfile = job.company_profiles

              // For Trade Jobs, poster could be homeowner OR company
              // For Vacancies, poster is always company
              const isTradeJob = job.is_tradespeople_job

              return {
                ...job,
                // Add poster information (prioritize homeowner for trade jobs, company for vacancies)
                poster_first_name: homeownerProfile?.first_name || null,
                poster_last_name: homeownerProfile?.last_name || null,
                poster_nickname: null,
                poster_logo_url: homeownerProfile?.profile_photo_url || companyProfile?.logo_url || null,
                poster_company_name: companyProfile?.company_name || null,
                // Add rating information
                average_rating: homeownerProfile?.average_rating || 0,
                total_reviews: homeownerProfile?.reviews_count || 0,
              }
            })

          setSearchProgress(`Found ${results.length} jobs...`)
          setSearchResultCount(results.length)
        }
      }

      setSearchProgress("Preparing results...")

      // Set center from selected location or first result
      let center: [number, number] = [50.8058, -1.0872]
      if (selectedLocation) {
        center = [selectedLocation.lat, selectedLocation.lon]
      } else if (results.length > 0) {
        const firstWithCoords = results.find((item: any) =>
          (item.latitude && item.longitude) || (item.coordinates?.lat && item.coordinates?.lon)
        )
        if (firstWithCoords) {
          if (firstWithCoords.coordinates) {
            center = [firstWithCoords.coordinates.lat, firstWithCoords.coordinates.lon]
          } else {
            center = [firstWithCoords.latitude, firstWithCoords.longitude]
          }
        }
      }

      // Check if result limit was reached and trim if necessary
      if (results.length > RESULT_LIMIT) {
        debug(`[MAIN-PAGE-SEARCH] Result limit reached: ${results.length} results found, showing first ${RESULT_LIMIT}`)
        results = results.slice(0, RESULT_LIMIT)
        setResultLimitReached(true)
      } else {
        setResultLimitReached(false)
      }

      // Dispatch event to hide guest banner BEFORE showing modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mainPageSearch'))
      }

      debug(`[SEARCH] results: ${results.length} type=${type}`)
      setMapResults(results)
      setMapCenter(center)
      setSearchType(type)
      setModalSearchType(type)  // Store the type specifically for modal display

      // Multi-stage fallback for autoSearch (only when triggered from nav Jobs button)
      if (type === "jobs_tasks" && results.length === 0 && autoSearchSkillsLabel !== null) {
        const stage = autoSearchFallbackStageRef.current

        if (stage === 0) {
          // Stage 1 done (user skills) → try Stage 2: related trade
          const related = getRelatedTrade(autoSearchOriginalQueryRef.current)
          if (related && related.toLowerCase() !== autoSearchOriginalQueryRef.current.toLowerCase()) {
            debug(`[MAIN-PAGE-SEARCH] Fallback stage 2: trying related trade "${related}"`)
            autoSearchFallbackStageRef.current = 1
            setSearchQuery(related)
            setTimeout(() => handleSearch("jobs_tasks"), 250)
            return
          }
          // No related trade known → skip straight to stage 3
          autoSearchFallbackStageRef.current = 1
        }

        if (autoSearchFallbackStageRef.current === 1) {
          // Stage 2 done (related trade) → try Stage 3: any nearby trade jobs (empty query)
          debug(`[MAIN-PAGE-SEARCH] Fallback stage 3: searching any nearby trade jobs`)
          autoSearchFallbackStageRef.current = 2
          setSearchQuery("")
          setTimeout(() => handleSearch("jobs_tasks"), 250)
          return
        }

        // All stages exhausted → open modal with empty map; inline panel shows the message
        debug(`[MAIN-PAGE-SEARCH] All fallback stages exhausted - showing empty map`)
        autoSearchFallbackStageRef.current = 3
        setShowMapModal(true)
        return
      }

      // Clear overlay if this search found results
      if (results.length > 0) {
        setShowNoJobsOverlay(false)
      }

      setShowMapModal(true)
    } catch (error) {
      console.warn("[MAIN-PAGE-SEARCH] Search error:", error)
    } finally {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current = null
      }
      searchInFlightRef.current = false
      setIsSearching(false)
      setInitialSearchDone(true)
      debug(`[MAIN-PAGE-SEARCH] Search completed, isSearching set to false`)
    }
  }

  // ── No-jobs overlay action handlers ──────────────────────────────────────────

  const handleExpandRadius = () => {
    const doubled = Math.min((parseInt(distance) || 5) * 2, 50).toString()
    setShowNoJobsOverlay(false)
    setShowFilters(false)
    // Reset fallback so a fresh skill search runs with expanded radius
    autoSearchFallbackStageRef.current = 0
    setSearchQuery(autoSearchOriginalQueryRef.current || "")
    setAutoSearchSkillsLabel(autoSearchOriginalQueryRef.current || null)
    setDistance(doubled)
    // Trigger search via restoreSearch effect — runs after state commits, avoids stale closures
    setRestoreSearch("jobs_tasks")
  }

  const handleShowAllConstruction = () => {
    setShowNoJobsOverlay(false)
    setShowFilters(false)
    // Skip fallback stages — just search "Construction" in same area
    autoSearchFallbackStageRef.current = 3
    setSearchQuery("Construction")
    setAutoSearchSkillsLabel(null)
    setRestoreSearch("jobs_tasks")
  }

  const handleOpenFiltersFromOverlay = () => {
    setShowNoJobsOverlay(false)
    setShowFilters(true)
  }

  // ── Map picker ───────────────────────────────────────────────────────────────

  const handleMapPickerClick = () => {
    // Dispatch event to hide banners when map picker opens
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mainPageSearch'))
    }
    setMapPickerKey(prev => prev + 1) // Increment key to force fresh map instance
    setShowMapPicker(true)
  }

  const handleMapLocationPick = (lat: number, lon: number) => {
    setMapPickerLocation({
      lat,
      lon,
      name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    })
  }

  const confirmMapPickerLocation = () => {
    if (mapPickerLocation) {
      setLocation(mapPickerLocation.name)
      setSelectedLocation({ lat: mapPickerLocation.lat, lon: mapPickerLocation.lon })
      setDistance(mapPickerRadius) // Apply the selected radius to distance filter
      setShowMapPicker(false)
      setLocationError("")
      if (!showMapModal) setShowFilters(true) // Only expand filters when not inside the map modal
    }
  }

  const cancelMapPicker = () => {
    setShowMapPicker(false)
    setMapPickerLocation(null)
    setMapPickerRadius("10")
  }

  // Handle search updates within modal without navigation
  const handleModalSearchUpdate = useCallback(async (params: any) => {
    // Store params so periodic refresh can re-use them
    lastModalSearchParamsRef.current = params
    try {
      let results: any[] = []
      // "any" is a sentinel value meaning "no specific query, location-based only" — treat as empty
      const rawSearch = params.search || ""
      const searchTerm = rawSearch === "any" ? "" : rawSearch

      // Get location from params or use the original selectedLocation
      const searchLat = params.lat ? parseFloat(params.lat) : selectedLocation?.lat
      const searchLng = params.lng ? parseFloat(params.lng) : selectedLocation?.lon
      const searchRadius = params.radius ? parseInt(params.radius) : (distance ? parseInt(distance) : 10)
      // Sync outer distance state so modalSearchParams.radius stays current
      if (params.radius && params.radius !== distance) setDistance(params.radius)

      // Determine search type: prefer params.traders/jobs_tasks/vacancies over modalSearchType
      const effectiveSearchType = params.traders === "true" ? "traders"
        : params.jobs_tasks === "true" ? "jobs_tasks"
        : params.vacancies === "true" ? "vacancies"
        : params.talents === "true" ? "talents"
        : modalSearchType



      if (effectiveSearchType === "traders") {
        // Use the same search_traders RPC as the main search (bypasses RLS, fast)
        const effectiveLat = searchLat ?? mapCenter[0]
        const effectiveLng = searchLng ?? mapCenter[1]
        const rpcLang = (params.language && params.language !== "all") ? params.language : null

        let rpcData: any[] = []
        try {
          const rpcResult = await Promise.race([
            supabase.rpc("search_traders", {
              p_lat:          effectiveLat,
              p_lon:          effectiveLng,
              p_radius_miles: searchRadius,
              p_search:       searchTerm || null,
              p_language:     rpcLang,
              p_limit:        RESULT_LIMIT + 1,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("QUERY_TIMEOUT")), 8000)
            ),
          ])
          if (rpcResult.error) console.warn('[MODAL-SEARCH] search_traders error:', rpcResult.error)
          else rpcData = rpcResult.data ?? []
        } catch (err: any) {
          console.warn('[MODAL-SEARCH] search_traders failed:', err.message)
        }

        if (searchLat && searchLng) {
          rpcData = filterByRadius(rpcData, searchLat, searchLng, searchRadius)
        }

        results = rpcData.map((item: any) => normalizeTraderResult(item))

        // Apply client-side filters that aren't handled by the RPC
        if (params.open_for_business === "true") {
          results = results.filter((r: any) => r.open_for_business === true)
        }
        if (params.self_employed === "true") {
          results = results.filter((r: any) => r.is_self_employed === true)
        }
        if (params.company === "true") {
          results = results.filter((r: any) => r.is_self_employed === false)
        }
      } else if (effectiveSearchType === "talents") {
        // Fetch all professionals (not just self-employed)
        let query = supabase
          .from("professional_profiles")
          .select("*, users!inner(id)")
          .eq("profile_visible", true)
          .eq("available_for_work", true)

        if (searchTerm) {
          // Get bilingual search terms for cross-language search
          const searchTerms = getBilingualSearchTerms(searchTerm)
          const orConditions = searchTerms.flatMap(term => [
            `first_name.ilike.%${term}%`,
            `last_name.ilike.%${term}%`,
            `title.ilike.%${term}%`
          ]).join(',')
          query = query.or(orConditions)
        }

        // Apply location-based radius filtering if coordinates are available
        if (searchLat && searchLng) {
          const radiusKm = searchRadius * 1.60934 // Convert miles to km

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(searchLat * Math.PI / 180))

          query = query
            .gte("latitude", searchLat - latDelta)
            .lte("latitude", searchLat + latDelta)
            .gte("longitude", searchLng - lngDelta)
            .lte("longitude", searchLng + lngDelta)
        }

        const { data, error } = await query.limit(RESULT_LIMIT + 1)

        if (!error && data) {
          results = data
            .filter(item => item.latitude && item.longitude)
            .map(item => ({
              ...item,
              id: item.id,
              // Respect hide_personal_name privacy setting: show nickname or Anonymous if name is hidden
              name: !item.hide_personal_name && (item.first_name || item.last_name)
                ? `${item.first_name || ''} ${item.last_name || ''}`.trim()
                : (item.nickname || 'Anonymous'),
              coordinates: {
                lat: item.latitude,
                lon: item.longitude
              }
            }))
        }
      } else if (effectiveSearchType === "vacancies" || effectiveSearchType === "jobs_tasks") {
        // Fetch jobs - exclude expired ones
        // Vacancies = employee positions (is_tradespeople_job = false)
        // Jobs/Tasks = tradespeople work (is_tradespeople_job = true)
        let query = supabase
          .from("jobs")
          .select(`
            *,
            company_profiles!company_id (
              company_name,
              location,
              industry,
              logo_url,
              user_id
            ),
            homeowner_profiles!homeowner_id (
              id,
              user_id,
              first_name,
              last_name,
              profile_photo_url,
              average_rating,
              reviews_count
            )
          `)
          .eq("status", "POSTED") // Only show jobs open for applications
          .eq("is_active", true)
          .eq("is_tradespeople_job", effectiveSearchType === "jobs_tasks") // true for jobs/tasks, false for vacancies
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        }

        // Apply location-based radius filtering if coordinates are available
        if (searchLat && searchLng) {
          const radiusKm = searchRadius * 1.60934 // Convert miles to km

          // Use bounding box approximation for radius search
          const latDelta = radiusKm / 111.0 // Rough conversion: 1 degree ≈ 111 km
          const lngDelta = radiusKm / (111.0 * Math.cos(searchLat * Math.PI / 180))

          // Include jobs with no coordinates (they pass through) OR jobs within the bounding box
          query = query.or(
            `latitude.is.null,longitude.is.null,and(latitude.gte.${searchLat - latDelta},latitude.lte.${searchLat + latDelta},longitude.gte.${searchLng - lngDelta},longitude.lte.${searchLng + lngDelta})`
          )
        }

        const { data, error } = await query.limit(RESULT_LIMIT + 1)

        if (error) {
          console.error(`[MAIN-PAGE-SEARCH-MODAL] Query error:`, error)
        }

        if (!error && data) {

          // Enrich jobs with poster information
          results = data
            .map((job: any) => {
              const homeownerProfile = job.homeowner_profiles

              return {
                ...job,
                // Add poster information from homeowner profile if available
                poster_first_name: homeownerProfile?.first_name || null,
                poster_last_name: homeownerProfile?.last_name || null,
                poster_nickname: null, // Homeowners don't have nicknames
                poster_logo_url: homeownerProfile?.profile_photo_url || null,
                // Add rating information from homeowner profile
                average_rating: homeownerProfile?.average_rating || 0,
                total_reviews: homeownerProfile?.reviews_count || 0,
              }
            })


        }
      }

      setMapResults(results)

      // Update center if lat/lng provided
      if (params.lat && params.lng) {
        setMapCenter([parseFloat(params.lat), parseFloat(params.lng)])
      }
    } catch (error) {
      console.error("Modal search update error:", error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, distance, modalSearchType, mapCenter])


  // Auto-refresh trade jobs map every 2 minutes so urgent jobs stay current
  useEffect(() => {
    if (!showMapModal || modalSearchType !== "jobs_tasks") return
    const id = setInterval(() => {
      if (lastModalSearchParamsRef.current) {
        handleModalSearchUpdate(lastModalSearchParamsRef.current)
      }
    }, 120000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMapModal, modalSearchType])

  // Tab configuration with icons - order changes based on user type
  // Companies see Trade Jobs first, others see Tradespeople first
  const tabConfig = useMemo(() => {
    const allTabs = [
      {
        key: "traders" as const,
        icon: HardHat,
        label: t('mainSearch.tradespeople'),
        color: "orange",
        bgActive: "bg-orange-500/20",
        textActive: "text-orange-400",
        underline: "bg-orange-400"
      },
      {
        key: "jobs_tasks" as const,
        icon: ClipboardList,
        label: t('mainSearch.tradeJobs'),
        color: "purple",
        bgActive: "bg-purple-500/20",
        textActive: "text-purple-400",
        underline: "bg-purple-400"
      },
      {
        key: "vacancies" as const,
        icon: Building2,
        label: t('mainSearch.vacancies'),
        color: "blue",
        bgActive: "bg-blue-500/20",
        textActive: "text-blue-400",
        underline: "bg-blue-400"
      },
      {
        key: "talents" as const,
        icon: UserSearch,
        label: t('mainSearch.jobseekers'),
        color: "emerald",
        bgActive: "bg-emerald-500/20",
        textActive: "text-emerald-400",
        underline: "bg-emerald-400"
      },
    ]

    // Filter out vacancies and jobseekers tabs if admin has disabled them
    const baseConfig = vacanciesJobseekersEnabled
      ? allTabs
      : allTabs.filter(tab => tab.key === 'traders' || tab.key === 'jobs_tasks')

    // For company users: show only Trade Jobs + Vacancies (jobs_tasks first)
    if (userType === 'company') {
      return baseConfig.filter(tab => tab.key === 'jobs_tasks' || tab.key === 'vacancies')
    }

    return baseConfig
  }, [userType, t, vacanciesJobseekersEnabled])

  // Dynamic headline based on selected tab
  const getHeadline = () => {
    switch (selectedSearchType) {
      case "traders": return t('mainSearch.titleTradespeople')
      case "jobs_tasks": return t('mainSearch.titleTradeJobs')
      case "vacancies": return t('mainSearch.titleVacancies')
      case "talents": return t('mainSearch.titleJobseekers')
      default: return t('mainSearch.title')
    }
  }

  // Memoize modal searchParams so ProfessionalsPageContent doesn't re-render on every parent state change
  const modalSearchParams = useMemo(() => ({
    search: searchQuery,
    location: location,
    lat: selectedLocation?.lat.toString(),
    lng: selectedLocation?.lon.toString(),
    radius: distance,
    traders: modalSearchType === "traders" ? "true" : undefined,
    vacancies: modalSearchType === "vacancies" ? "true" : undefined,
    jobs_tasks: modalSearchType === "jobs_tasks" ? "true" : undefined,
    talents: modalSearchType === "talents" ? "true" : undefined,
    jobType: jobType !== "all" ? jobType : undefined,
    experienceLevel: experienceLevel !== "all" ? experienceLevel : undefined,
    workLocation: workLocation !== "all" ? workLocation : undefined,
    salaryRange: salaryRange !== "all" ? salaryRange : undefined,
    noExperienceRequired: noExperienceRequired ? "true" : undefined,
    drivingLicenseRequired: drivingLicenseRequired ? "true" : undefined,
    ownTransportRequired: ownTransportRequired ? "true" : undefined,
    tradeCategory: tradeCategory !== "all" ? tradeCategory : undefined,
    urgency: urgency !== "all" ? urgency : undefined,
    budgetRange: budgetRange !== "all" ? budgetRange : undefined,
    tradeJobType: tradeJobType !== "all" ? tradeJobType : undefined,
    employmentStatus: employmentStatus !== "all" ? employmentStatus : undefined,
    hasCVUploaded: hasCVUploaded ? "true" : undefined,
    hasDrivingLicense: hasDrivingLicense ? "true" : undefined,
    hasOwnTransport: hasOwnTransport ? "true" : undefined,
    willingToRelocate: willingToRelocate ? "true" : undefined,
    availableForBusiness: availableForBusiness ? "true" : undefined,
  }), [
    searchQuery, location, selectedLocation, distance, modalSearchType,
    jobType, experienceLevel, workLocation, salaryRange, noExperienceRequired,
    drivingLicenseRequired, ownTransportRequired, tradeCategory, urgency,
    budgetRange, tradeJobType, employmentStatus, hasCVUploaded, hasDrivingLicense,
    hasOwnTransport, willingToRelocate, availableForBusiness,
  ])

  const handleViewAllJobs = useCallback(() => {
    autoSearchSkillsListRef.current = []
    setAutoSearchSkillsLabel(null)
    setSearchQuery("")
    handleSearch("jobs_tasks")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSearch])

  const handleModalClose = useCallback(() => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
      searchAbortControllerRef.current = null
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('mainPageSearchClose'))
      window.history.replaceState({}, '', '/')
    }
    setShowMapModal(false)
  }, [])

  return (
    <div className="w-full relative z-[100]">
      <div className="max-w-3xl mx-auto bg-slate-900/95 backdrop-blur-sm rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 shadow-xl border border-white/10">
        {/* Dynamic Headline */}
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4 md:mb-5 text-center transition-all duration-300">
          {getHeadline()}
        </h2>

        {/* Icon-based Navigation Tabs - hidden for homeowner (fixed to Tradespeople view) */}
        {userType !== 'homeowner' && (
        <div className="flex justify-center gap-4 sm:gap-6 md:gap-10 mb-5 sm:mb-6">
          {tabConfig.map(({ key, icon: Icon, label, bgActive, textActive, underline }) => (
            <button
              key={key}
              onClick={() => handleSearchTypeChange(key)}
              className="flex flex-col items-center gap-2 group relative pb-3"
              role="tab"
              aria-selected={selectedSearchType === key}
            >
              {/* Icon Container - uniform compact size */}
              <div className={`
                p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300
                ${selectedSearchType === key
                  ? `${bgActive} ${textActive}`
                  : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white/80'}
              `}>
                <Icon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
              </div>
              {/* Label - uniform compact size */}
              <span className={`
                text-xs sm:text-sm md:text-base font-medium transition-colors duration-200 whitespace-nowrap
                ${selectedSearchType === key ? 'text-white' : 'text-white/60 group-hover:text-white/80'}
              `}>
                {label}
              </span>
              {/* Underline Indicator - Airbnb style - thicker */}
              <div className={`
                absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full
                transition-all duration-300 ease-out
                ${selectedSearchType === key
                  ? `w-full ${underline}`
                  : 'w-0 bg-transparent'}
              `} />
            </button>
          ))}
        </div>
        )}

        {/* Search Inputs */}
        <div className="flex flex-col gap-2">
          {/* First row: Search input, Location input, Map picker */}
          <div className="flex gap-2 items-start">
            {/* Search input with autocomplete */}
            <div className="flex-1 h-8 sm:h-9 md:h-10 relative">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                }}
                onKeyPress={(e) => e.key === "Enter" && handleSearch(selectedSearchType)}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => {
                    setShowSuggestions(false)
                  }, 200)
                }}
                placeholder={t('mainSearch.searchPlaceholder')}
                className="h-full text-xs md:text-sm px-3 md:px-4 bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-emerald-500/30 rounded-md md:rounded-lg font-medium placeholder:text-slate-400 shadow-md w-full"
              />

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        // Prevent blur event on input
                        e.preventDefault()
                        // Set flag to skip autocomplete when suggestion is selected
                        skipAutocompleteRef.current = true
                        setSearchQuery(suggestion)
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-slate-700 last:border-b-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Location input */}
            <div className="flex-1 h-8 sm:h-9 md:h-10">
              <LocationInput
                value={location}
                onChange={setLocation}
                onLocationSelect={handleLocationSelect}
                placeholder={t('mainSearch.locationPlaceholder')}
                error={locationError}
              />
            </div>

            {/* Map picker button */}
            <Button
              onClick={handleMapPickerClick}
              className="h-8 sm:h-9 md:h-10 px-2 sm:px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 border border-slate-600"
              title={t('mainSearch.pickLocationOnMap')}
              type="button"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Map</span>
            </Button>

            {/* Search button - desktop only */}
            <Button
              onClick={() => handleSearch(selectedSearchType)}
              disabled={isSearching}
              className={`hidden sm:flex h-8 sm:h-9 md:h-10 px-4 sm:px-6 text-xs sm:text-sm font-bold text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex-shrink-0 ${
                selectedSearchType === "vacancies" ? "bg-blue-600 hover:bg-blue-700" :
                selectedSearchType === "jobs_tasks" ? "bg-purple-600 hover:bg-purple-700" :
                selectedSearchType === "traders" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Search className="h-4 w-4 mr-1.5" />
              {isSearching ? t('mainSearch.searching') : t('mainSearch.search')}
            </Button>

            {/* Filter button - desktop only */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`hidden sm:flex h-8 sm:h-9 md:h-10 px-2 sm:px-3 text-xs font-medium text-white rounded-md md:rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 bg-slate-700 hover:bg-slate-600 border border-slate-600 ${showFilters ? "ring-2 ring-emerald-500/50" : ""}`}
              title={t('mainSearch.toggleFilters')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="ml-1.5">Filters</span>
            </Button>
          </div>

          {/* Second row: Search and Filter buttons - mobile only */}
          <div className="sm:hidden flex gap-2">
            <Button
              onClick={() => handleSearch(selectedSearchType)}
              disabled={isSearching}
              className={`flex-1 h-8 text-xs font-bold text-white rounded-md shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 ${
                selectedSearchType === "vacancies" ? "bg-blue-600 hover:bg-blue-700" :
                selectedSearchType === "jobs_tasks" ? "bg-purple-600 hover:bg-purple-700" :
                selectedSearchType === "traders" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <Search className="h-4 w-4 mr-1.5" />
              {isSearching ? t('mainSearch.searching') : t('mainSearch.search')}
            </Button>

            {/* Filter button - mobile */}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-8 px-3 text-xs font-medium text-white rounded-md shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0 bg-slate-700 hover:bg-slate-600 border border-slate-600 ${showFilters ? "ring-2 ring-emerald-500/50" : ""}`}
              title={t('mainSearch.toggleFilters')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Skills-based search indicator — shown when nav "Jobs" button was used */}
          {autoSearchSkillsLabel && selectedSearchType === "jobs_tasks" && !showFilters && (
            <div className="mt-2 flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
              <span className="text-xs text-slate-300">
                {autoSearchIndustryRef.current ? "Matching your trade:" : "Matching your skills:"}{" "}
                <span className="text-emerald-400 font-medium">{autoSearchSkillsLabel}</span>
              </span>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    autoSearchSkillsListRef.current = []
                    autoSearchIndustryRef.current   = null
                    autoSearchServicesRef.current   = []
                    setAutoSearchSkillsLabel(null)
                    setSearchQuery("")
                    handleSearch("jobs_tasks")
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
                >
                  All jobs
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowFilters(true)
                    setAutoSearchSkillsLabel(null)
                    autoSearchSkillsListRef.current = []
                    autoSearchIndustryRef.current   = null
                    autoSearchServicesRef.current   = []
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Filter Panel - shows when showFilters is true */}
          {showFilters && (
            <div className="mt-3 p-3 sm:p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
              <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                {t('common.filters')}
                {selectedSearchType === "vacancies" && t('mainSearch.filtersJobVacancies')}
                {selectedSearchType === "jobs_tasks" && t('mainSearch.filtersTradeJobs')}
                {selectedSearchType === "traders" && t('mainSearch.filtersTradespeople')}
                {selectedSearchType === "talents" && t('mainSearch.filtersTalents')}
              </h3>

              {/* Vacancies Filters */}
              {selectedSearchType === "vacancies" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.jobType')}</label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTypes')}</SelectItem>
                        <SelectItem value="full-time">{t('mainSearch.fullTime')}</SelectItem>
                        <SelectItem value="part-time">{t('mainSearch.partTime')}</SelectItem>
                        <SelectItem value="contract">{t('mainSearch.contract')}</SelectItem>
                        <SelectItem value="temporary">{t('mainSearch.temporary')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.experienceLevel')}</label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allLevels')}</SelectItem>
                        <SelectItem value="entry">{t('mainSearch.entryLevel')}</SelectItem>
                        <SelectItem value="mid">{t('mainSearch.midLevel')}</SelectItem>
                        <SelectItem value="senior">{t('mainSearch.seniorLevel')}</SelectItem>
                        <SelectItem value="lead">{t('mainSearch.leadPrincipal')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.workLocation')}</label>
                    <Select value={workLocation} onValueChange={setWorkLocation}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allLocations')}</SelectItem>
                        <SelectItem value="remote">{t('mainSearch.remote')}</SelectItem>
                        <SelectItem value="onsite">{t('mainSearch.onsite')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.salaryRange')}</label>
                    <Select value={salaryRange} onValueChange={setSalaryRange}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anySalary')}</SelectItem>
                        <SelectItem value="0-30k">{t('mainSearch.under30k')}</SelectItem>
                        <SelectItem value="30-50k">{t('mainSearch.salary30to50k')}</SelectItem>
                        <SelectItem value="50-75k">{t('mainSearch.salary50to75k')}</SelectItem>
                        <SelectItem value="75-100k">{t('mainSearch.salary75to100k')}</SelectItem>
                        <SelectItem value="100k+">{t('mainSearch.salary100kPlus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">Language</label>
                    <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Portuguese">Portuguese</SelectItem>
                        <SelectItem value="Polish">Polish</SelectItem>
                        <SelectItem value="Romanian">Romanian</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                        <SelectItem value="Russian">Russian</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="Chinese">Chinese</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Skills Input */}
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.requiredSkills')}</label>
                    <Input
                      placeholder={t('mainSearch.skillsPlaceholder')}
                      className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Checkbox filters for Vacancies */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={noExperienceRequired}
                        onChange={(e) => setNoExperienceRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.noExperienceTraining')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={drivingLicenseRequired}
                        onChange={(e) => setDrivingLicenseRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.drivingLicenseRequired')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={ownTransportRequired}
                        onChange={(e) => setOwnTransportRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.ownTransportRequired')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Trade Jobs Filters */}
              {selectedSearchType === "jobs_tasks" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.urgency')}</label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyTime')}</SelectItem>
                        <SelectItem value="urgent">{t('mainSearch.urgentASAP')}</SelectItem>
                        <SelectItem value="week">{t('mainSearch.withinWeek')}</SelectItem>
                        <SelectItem value="month">{t('mainSearch.withinMonth')}</SelectItem>
                        <SelectItem value="flexible">{t('mainSearch.flexible')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.budgetRange')}</label>
                    <Select value={budgetRange} onValueChange={setBudgetRange}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyBudget')}</SelectItem>
                        <SelectItem value="0-500">{t('mainSearch.under500')}</SelectItem>
                        <SelectItem value="500-1k">{t('mainSearch.budget500to1k')}</SelectItem>
                        <SelectItem value="1k-5k">{t('mainSearch.budget1kto5k')}</SelectItem>
                        <SelectItem value="5k-10k">{t('mainSearch.budget5kto10k')}</SelectItem>
                        <SelectItem value="10k+">{t('mainSearch.budget10kPlus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.jobType')}</label>
                    <Select value={tradeJobType} onValueChange={setTradeJobType}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTypes')}</SelectItem>
                        <SelectItem value="one-off">{t('mainSearch.oneOffJob')}</SelectItem>
                        <SelectItem value="ongoing">{t('mainSearch.ongoingWork')}</SelectItem>
                        <SelectItem value="emergency">{t('mainSearch.emergency')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">Language</label>
                    <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Portuguese">Portuguese</SelectItem>
                        <SelectItem value="Polish">Polish</SelectItem>
                        <SelectItem value="Romanian">Romanian</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                        <SelectItem value="Russian">Russian</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="Chinese">Chinese</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkbox filters for Trade Jobs */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={noExperienceRequired}
                        onChange={(e) => setNoExperienceRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.noExperienceRequired')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={drivingLicenseRequired}
                        onChange={(e) => setDrivingLicenseRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.drivingLicenseRequired')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={ownTransportRequired}
                        onChange={(e) => setOwnTransportRequired(e.target.checked)}
                      />
                      <span>{t('mainSearch.ownTransportRequired')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tradespeople Filters */}
              {selectedSearchType === "traders" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.distance')}</label>
                    <Select value={distance} onValueChange={setDistance}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">{t('mainSearch.within5Miles')}</SelectItem>
                        <SelectItem value="10">{t('mainSearch.within10Miles')}</SelectItem>
                        <SelectItem value="25">{t('mainSearch.within25Miles')}</SelectItem>
                        <SelectItem value="50">{t('mainSearch.within50Miles')}</SelectItem>
                        <SelectItem value="100">{t('mainSearch.within100Miles')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.urgency')}</label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyTime')}</SelectItem>
                        <SelectItem value="urgent">{t('mainSearch.urgentASAP')}</SelectItem>
                        <SelectItem value="week">{t('mainSearch.withinWeek')}</SelectItem>
                        <SelectItem value="month">{t('mainSearch.withinMonth')}</SelectItem>
                        <SelectItem value="flexible">{t('mainSearch.flexible')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.jobType')}</label>
                    <Select value={tradeJobType} onValueChange={setTradeJobType}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTypes')}</SelectItem>
                        <SelectItem value="one-off">{t('mainSearch.oneOffJob')}</SelectItem>
                        <SelectItem value="ongoing">{t('mainSearch.ongoingWork')}</SelectItem>
                        <SelectItem value="emergency">{t('mainSearch.emergency')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trade Category Input */}
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.tradeCategory')}</label>
                    <Select value={tradeCategory} onValueChange={setTradeCategory}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allTrades')}</SelectItem>
                        <SelectItem value="construction">{t('mainSearch.construction')}</SelectItem>
                        <SelectItem value="plumbing">{t('mainSearch.plumbing')}</SelectItem>
                        <SelectItem value="electrical">{t('mainSearch.electrical')}</SelectItem>
                        <SelectItem value="carpentry">{t('mainSearch.carpentry')}</SelectItem>
                        <SelectItem value="painting">{t('mainSearch.paintingDecorating')}</SelectItem>
                        <SelectItem value="roofing">{t('mainSearch.roofing')}</SelectItem>
                        <SelectItem value="landscaping">{t('mainSearch.landscaping')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">Language</label>
                    <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Portuguese">Portuguese</SelectItem>
                        <SelectItem value="Polish">Polish</SelectItem>
                        <SelectItem value="Romanian">Romanian</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                        <SelectItem value="Russian">Russian</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="Chinese">Chinese</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkbox filters for Tradespeople */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={availableForBusiness}
                        onChange={(e) => setAvailableForBusiness(e.target.checked)}
                      />
                      <span>{t('mainSearch.service247')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Talents Filters */}
              {selectedSearchType === "talents" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.experienceLevel')}</label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.allLevels')}</SelectItem>
                        <SelectItem value="entry">{t('mainSearch.entryLevel02')}</SelectItem>
                        <SelectItem value="mid">{t('mainSearch.midLevel35')}</SelectItem>
                        <SelectItem value="senior">{t('mainSearch.senior610')}</SelectItem>
                        <SelectItem value="expert">{t('mainSearch.expert10Plus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.employmentStatus')}</label>
                    <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('mainSearch.anyStatus')}</SelectItem>
                        <SelectItem value="unemployed">{t('mainSearch.lookingForWork')}</SelectItem>
                        <SelectItem value="employed">{t('mainSearch.openToOpportunities')}</SelectItem>
                        <SelectItem value="self-employed">{t('mainSearch.selfEmployed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">{t('mainSearch.distance')}</label>
                    <Select value={distance} onValueChange={setDistance}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">{t('mainSearch.within5Miles')}</SelectItem>
                        <SelectItem value="10">{t('mainSearch.within10Miles')}</SelectItem>
                        <SelectItem value="25">{t('mainSearch.within25Miles')}</SelectItem>
                        <SelectItem value="50">{t('mainSearch.within50Miles')}</SelectItem>
                        <SelectItem value="100">{t('mainSearch.within100Miles')}</SelectItem>
                        <SelectItem value="remote">{t('mainSearch.remoteAnyLocation')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-white/70 mb-1.5 block">Language</label>
                    <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
                      <SelectTrigger className="h-8 sm:h-9 text-xs bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Portuguese">Portuguese</SelectItem>
                        <SelectItem value="Polish">Polish</SelectItem>
                        <SelectItem value="Romanian">Romanian</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                        <SelectItem value="Russian">Russian</SelectItem>
                        <SelectItem value="Arabic">Arabic</SelectItem>
                        <SelectItem value="Chinese">Chinese</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Checkbox filters for Talents */}
                  <div className="sm:col-span-2 space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={hasCVUploaded}
                        onChange={(e) => setHasCVUploaded(e.target.checked)}
                      />
                      <span>{t('mainSearch.hasCVUploaded')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={hasDrivingLicense}
                        onChange={(e) => setHasDrivingLicense(e.target.checked)}
                      />
                      <span>{t('mainSearch.hasDrivingLicense')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={hasOwnTransport}
                        onChange={(e) => setHasOwnTransport(e.target.checked)}
                      />
                      <span>{t('mainSearch.hasOwnTransport')}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-white/30 bg-white/10"
                        checked={willingToRelocate}
                        onChange={(e) => setWillingToRelocate(e.target.checked)}
                      />
                      <span>{t('mainSearch.willingToRelocate')}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Clear Filters Button */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                <Button
                  onClick={async () => {
                    // Reset all filters to default values
                    setJobType("all")
                    setExperienceLevel("all")
                    setWorkLocation("all")
                    setSalaryRange("all")
                    setNoExperienceRequired(false)
                    setDrivingLicenseRequired(false)
                    setOwnTransportRequired(false)
                    setTradeCategory("all")
                    setUrgency("all")
                    setBudgetRange("all")
                    setTradeJobType("all")
                    setDistance("10")
                    setEmploymentStatus("all")
                    setHasCVUploaded(false)
                    setHasDrivingLicense(false)
                    setHasOwnTransport(false)
                    setWillingToRelocate(false)
                    setAvailableForBusiness(false)
                    setSpokenLanguage("all")

                    // Trigger a new search with cleared filters
                    // Use setTimeout to ensure state updates are processed first
                    setTimeout(() => {
                      handleSearch(selectedSearchType)
                    }, 100)
                  }}
                  variant="outline"
                  className="flex-1 h-8 text-xs bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  {t('mainSearch.clearFilters')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Search Progress Modal */}
        <Dialog open={isSearching} onOpenChange={(open) => {
          // Allow closing if user clicks outside (safety mechanism if search gets stuck)
          if (!open) {
            if (searchAbortControllerRef.current) {
              searchAbortControllerRef.current.abort()
              searchAbortControllerRef.current = null
            }
            searchInFlightRef.current = false
            setIsSearching(false)
            setSearchProgress("")
            setSearchResultCount(0)
          }
        }}>
          <DialogContent className="max-w-md" showCloseButton={true}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-center">
                Searching...
              </DialogTitle>
              <DialogDescription className="sr-only">
                Searching the database for results
              </DialogDescription>
            </DialogHeader>
            <div className="py-8 flex flex-col items-center gap-6">
              {/* Animated spinner */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Search className="h-6 w-6 text-blue-500" />
                </div>
              </div>

              {/* Progress message */}
              <div className="text-center space-y-2">
                <p className="text-base text-gray-700 font-medium">
                  {searchProgress}
                </p>
                {searchResultCount > 0 && (
                  <p className="text-sm text-gray-500">
                    {searchResultCount} {searchResultCount === 1 ? 'result' : 'results'} found
                  </p>
                )}
              </div>

              {/* Loading bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Please wait while we search our database...
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search Error Dialog */}
        <Dialog open={!!searchError} onOpenChange={(open) => {
          if (!open) setSearchError(null)
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-center flex items-center justify-center gap-2">
                {searchError?.type === 'network' && (
                  <span className="text-orange-500">⚠️</span>
                )}
                {searchError?.type === 'timeout' && (
                  <span className="text-yellow-500">⏱️</span>
                )}
                {searchError?.type === 'error' && (
                  <span className="text-red-500">❌</span>
                )}
                {searchError?.type === 'network' ? 'Connection Issue' :
                 searchError?.type === 'timeout' ? 'Search Taking Too Long' :
                 'Search Failed'}
              </DialogTitle>
              <DialogDescription className="text-center pt-2">
                {searchError?.message}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center gap-4">
              {searchError?.type === 'network' && (
                <p className="text-sm text-gray-600 text-center">
                  Please check your internet connection and try again.
                </p>
              )}
              {searchError?.type === 'timeout' && (
                <p className="text-sm text-gray-600 text-center">
                  The search is taking longer than usual. This might be due to high traffic. Please try again or narrow your search.
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSearchError(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSearchError(null)
                    // Retry the search
                    handleSearch(selectedSearchType)
                  }}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Map Picker Modal - High z-index to appear above the search results modal */}
        <div style={{ zIndex: 10000, position: 'relative' }}>
          <Dialog open={showMapPicker} onOpenChange={(open) => {
            if (!open) cancelMapPicker()
          }}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-4xl max-h-[80vh] sm:max-h-[85vh] overflow-y-auto p-3 sm:p-6 bg-slate-900 border-slate-700" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg text-white">{t('mainSearch.mapPickerTitle')}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-400">
                {t('mainSearch.mapPickerDescription')}
              </DialogDescription>
            </DialogHeader>

            {/* Radius Control */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400 flex-shrink-0" />
                <label className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">{t('mainSearch.searchRadius')}</label>
                <Select value={mapPickerRadius} onValueChange={setMapPickerRadius}>
                  <SelectTrigger className="w-28 sm:w-32 h-8 sm:h-9 text-xs sm:text-sm font-medium border-slate-600 bg-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-slate-800 border-slate-600">
                    {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((miles) => (
                      <SelectItem key={miles} value={miles.toString()} className="text-white hover:bg-slate-700">
                        {miles} {miles !== 1 ? t('mainSearch.miles') : t('mainSearch.mile')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mapPickerLocation && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                  <span className="font-mono">{mapPickerLocation.lat.toFixed(4)}, {mapPickerLocation.lon.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Map Area - smaller on mobile to ensure footer is visible */}
            <div className="w-full h-[35vh] sm:h-[400px] rounded-lg overflow-hidden border border-slate-700 min-h-[200px]">
              <ProfessionalMap
                key={`map-picker-${mapPickerKey}`}
                professionals={[]}
                center={selectedLocation ? { lat: selectedLocation.lat, lon: selectedLocation.lon } : { lat: 50.8058, lon: -1.0872 }}
                zoom={8}
                height="100%"
                showRadius={!!mapPickerLocation}
                radiusCenter={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
                radiusKm={parseInt(mapPickerRadius) * 1.60934} // Convert miles to km
                onMapClick={handleMapLocationPick}
                selectedLocation={mapPickerLocation ? [mapPickerLocation.lat, mapPickerLocation.lon] : undefined}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
              <div className="text-xs sm:text-sm text-slate-400 text-center sm:text-left mb-2 sm:mb-0 sm:flex-1">
                {mapPickerLocation ? (
                  <span className="font-medium text-emerald-400">
                    {t('mainSearch.clickToConfirm')}
                  </span>
                ) : (
                  <span>
                    {t('mainSearch.clickMapToSelect')}
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-center sm:justify-end">
                <Button onClick={cancelMapPicker} variant="outline" size="sm" className="flex-1 sm:flex-none h-10 border-slate-600 text-slate-300 hover:bg-slate-800">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={confirmMapPickerLocation}
                  disabled={!mapPickerLocation}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none h-10"
                >
                  {t('mainSearch.useThisLocation')}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Preload Leaflet + tile cache in background so modal opens instantly */}
      <MapPreloader center={mapCenter} zoom={6} />

      {/* Full-Screen Map Modal - Uses Same Component as Professionals Page */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-900 z-[9999]" style={{ zIndex: 9999 }}>
          {/* Warning banner when result limit is reached */}
          {resultLimitReached && (
            <div className="bg-orange-900/50 border-b border-orange-700 px-4 py-3 text-center">
              <p className="text-sm text-orange-300">
                <span className="font-semibold">{t('mainSearch.moreThan100Results')}</span> {t('mainSearch.showing100Results')}
              </p>
            </div>
          )}

          {initialSearchDone ? (
            <ProfessionalsPageContent
              data={mapResults}
              user={user}
              userType={userType}
              userProfile={userProfile}
              searchParams={modalSearchParams as any}
              center={mapCenter}
              isModal={true}
              onSearchUpdate={handleModalSearchUpdate}
              onViewAllJobs={handleViewAllJobs}
              onModalClose={handleModalClose}
            />
          ) : (
            <div className="flex flex-col gap-4 p-4 h-full">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="flex-1 w-full rounded-xl" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
