"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Briefcase, Building, MapPin, Plus, X, Mail, AlertTriangle, Home, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import AddressAutoComplete from "@/components/address-autocomplete"
import { LocationData } from "@/lib/location-service"
import { CountrySelector } from "@/components/ui/country-selector"
import { LocationPicker } from "@/components/ui/location-picker"
import { HomeownerOnboardingForm } from "@/components/homeowner-onboarding-form"
import LanguageSelector from "@/components/language-selector"
import { useTranslation } from "@/lib/i18n/context"

interface OnboardingFlowProps {
  user: {
    id: string
    email: string
    user_metadata?: any
  }
  isVerificationPending?: boolean
  isEmailVerified?: boolean
}

export default function OnboardingFlow({
  user,
  isVerificationPending = false,
  isEmailVerified = true,
}: OnboardingFlowProps) {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useTranslation()

  // Get user type from sign-up metadata, convert "employer" to "company"
  const initialUserType = user.user_metadata?.user_type === "employer" ? "company" : user.user_metadata?.user_type

  // Skip step 1 if user already selected their type during sign-up
  const [step, setStep] = useState(initialUserType ? 2 : 1)
  const [userType, setUserType] = useState<"professional" | "company" | "homeowner" | null>(initialUserType || null)
  const [showResetOption, setShowResetOption] = useState(false)
  const [error, setError] = useState<{ title: string; message: string } | null>(null)

  // Auto-detect if user should be offered a reset
  useEffect(() => {
    const checkForReset = () => {
      // Show reset option if user has metadata but wrong/inconsistent state
      const shouldReset = (
        // User has metadata but is on step 1 (shouldn't happen normally)
        (initialUserType && step === 1) ||
        // User metadata doesn't match expected values
        (user.user_metadata?.user_type && !["professional", "company", "employer", "homeowner"].includes(user.user_metadata.user_type))
      )

      setShowResetOption(shouldReset)
    }

    checkForReset()
  }, [initialUserType, step, user.user_metadata])

  // Prevent browser back navigation during profile setup (step 2)
  useEffect(() => {
    if (step === 2) {
      // Push a dummy state to prevent back navigation
      window.history.pushState(null, '', window.location.href)

      const handlePopState = (e: PopStateEvent) => {
        // Push state again to keep user on the page
        window.history.pushState(null, '', window.location.href)

        // Optionally show a warning
        if (window.confirm(t('onboardingFlow.leaveWarning') || 'Are you sure you want to leave? Your progress will be lost and you will need to start over.')) {
          // If they really want to leave, clear metadata and redirect
          router.push('/')
        }
      }

      window.addEventListener('popstate', handlePopState)

      return () => {
        window.removeEventListener('popstate', handlePopState)
      }
    }
  }, [step, router, t])

  // Handle user type selection for existing users without metadata
  const handleUserTypeSelection = async (selectedType: "professional" | "company" | "homeowner") => {
    setUserType(selectedType)

    // Update user metadata to ensure consistency
    try {
      await supabase.auth.updateUser({
        data: { user_type: selectedType }
      })
      console.log("Updated user metadata with selected type:", selectedType)
    } catch (error) {
      console.error("Error updating user metadata:", error)
    }

    setStep(2)
  }
  const [loading, setLoading] = useState(false)
  const [verificationReminderDismissed, setVerificationReminderDismissed] = useState(false)
  const [professionalLocationData, setProfessionalLocationData] = useState<LocationData | null>(null)
  const [companyLocationData, setCompanyLocationData] = useState<LocationData | null>(null)
  const [dataPreFilled, setDataPreFilled] = useState(false)

  // Professional form data
  const [professionalData, setProfessionalData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    title: "",
    bio: "",
    experienceLevel: "mid" as "entry" | "mid" | "senior" | "lead" | "executive",
    skills: [] as string[],
    languages: [] as string[],
    portfolioUrl: "",
    websiteUrl: "",
    salaryMin: "",
    salaryMax: "",
    salaryFrequency: "per year" as "per year" | "per day" | "per hour",
    latitude: null as number | null,
    longitude: null as number | null,
    readyToRelocate: false,
    hasDrivingLicence: false,
    hasOwnTransport: false,
    employmentStatus: null as string | null,
    availability: "not_specified" as "available_now" | "available_week" | "available_month" | "not_specified",
    hidePersonalName: false,
  })

  // Company form data
  const [companyData, setCompanyData] = useState({
    companyName: "",
    description: "",
    industry: "",
    companySize: "",
    websiteUrl: "",
    phoneNumber: "",
    registrationNumber: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
    services: [] as string[],
    spokenLanguages: [] as string[],
    priceList: "",
    service24_7: false,
  })

  // UI state for adding services
  const [newService, setNewService] = useState("")
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false)
  const [filteredServiceSuggestions, setFilteredServiceSuggestions] = useState<string[]>([])

  // Pre-fill form with data from signup (user metadata and users table)
  useEffect(() => {
    const preFillFormData = async () => {
      if (dataPreFilled) return // Only run once

      try {
        // Check localStorage first for saved draft
        const savedProfessionalData = localStorage.getItem(`onboarding_professional_${user.id}`)
        const savedCompanyData = localStorage.getItem(`onboarding_company_${user.id}`)

        // Fetch user data from database
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("location, latitude, longitude")
          .eq("id", user.id)
          .single()

        if (userError) {
          console.error("Error fetching user data:", userError)
        }

        // Pre-fill professional form
        if (userType === "professional") {
          if (savedProfessionalData) {
            // Load from localStorage if exists
            try {
              const parsed = JSON.parse(savedProfessionalData)
              setProfessionalData(parsed)
              console.log("Loaded professional form from localStorage")
            } catch (e) {
              console.error("Error parsing saved professional data:", e)
            }
          } else {
            // Otherwise use signup data
            setProfessionalData(prev => ({
              ...prev,
              firstName: user.user_metadata?.first_name || "",
              lastName: user.user_metadata?.last_name || "",
              latitude: userData?.latitude || null,
              longitude: userData?.longitude || null,
            }))
            console.log("Pre-filled professional form with signup data")
          }
        }

        // Pre-fill company form
        if (userType === "company") {
          if (savedCompanyData) {
            // Load from localStorage if exists
            try {
              const parsed = JSON.parse(savedCompanyData)
              setCompanyData(parsed)
              console.log("Loaded company form from localStorage")
            } catch (e) {
              console.error("Error parsing saved company data:", e)
            }
          } else {
            // Otherwise use signup data
            setCompanyData(prev => ({
              ...prev,
              companyName: user.user_metadata?.company_name || "",
              latitude: userData?.latitude || null,
              longitude: userData?.longitude || null,
              location: userData?.location || "",
            }))
            console.log("Pre-filled company form with signup data")
          }
        }

        setDataPreFilled(true)
      } catch (error) {
        console.error("Error pre-filling form data:", error)
      }
    }

    if (userType && step === 2) {
      preFillFormData()
    }
  }, [userType, step, user, dataPreFilled])

  // Save professional form data to localStorage whenever it changes
  useEffect(() => {
    if (userType === "professional" && dataPreFilled && step === 2) {
      localStorage.setItem(`onboarding_professional_${user.id}`, JSON.stringify(professionalData))
      console.log("Saved professional form to localStorage")
    }
  }, [professionalData, userType, dataPreFilled, step, user.id])

  // Save company form data to localStorage whenever it changes
  useEffect(() => {
    if (userType === "company" && dataPreFilled && step === 2) {
      localStorage.setItem(`onboarding_company_${user.id}`, JSON.stringify(companyData))
      console.log("Saved company form to localStorage")
    }
  }, [companyData, userType, dataPreFilled, step, user.id])

  const [newSkill, setNewSkill] = useState("")
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [filteredSkillSuggestions, setFilteredSkillSuggestions] = useState<string[]>([])

  // Get job titles based on locale
  const getJobTitles = () => {
    const isPtBR = locale === 'pt-BR'

    if (isPtBR) {
      return [
        // Tech & IT
        "Engenheiro de Software", "Engenheiro de Software Sênior", "Desenvolvedor Full Stack",
        "Desenvolvedor Frontend", "Desenvolvedor Backend", "Desenvolvedor Mobile",
        "Engenheiro DevOps", "Cientista de Dados", "Analista de Dados",
        "Administrador de Banco de Dados", "Administrador de Sistemas", "Engenheiro de Redes",
        "Especialista em Cibersegurança", "Especialista em Suporte de TI", "Engenheiro de QA",
        // Design & Creative
        "Designer UX", "Designer UI", "Designer Gráfico", "Web Designer", "Designer de Produto",
        "Diretor de Arte", "Animador", "Editor de Vídeo", "Fotógrafo", "Ilustrador",
        // Business & Management
        "Gerente de Produto", "Gerente de Projetos", "Analista de Negócios", "Consultor de Gestão",
        "Gerente de Operações", "Gerente Geral", "CEO", "COO", "Gerente de Desenvolvimento de Negócios",
        // Sales & Marketing
        "Gerente de Marketing", "Especialista em Marketing Digital", "Gerente de Mídias Sociais",
        "Redator de Conteúdo", "Copywriter", "Especialista em SEO", "Gerente de Vendas",
        "Representante de Vendas", "Gerente de Contas", "Gerente de Marca",
        // Finance & Accounting
        "Contador", "Analista Financeiro", "Consultor Financeiro", "Consultor Fiscal",
        "Auditor", "Escriturário Contábil", "Especialista em Folha de Pagamento",
        // Human Resources
        "Gerente de RH", "Especialista em RH", "Recrutador", "Especialista em Aquisição de Talentos",
        // Healthcare
        "Enfermeiro", "Enfermeiro Registrado", "Enfermeiro Prático", "Médico", "Clínico Geral",
        "Cirurgião", "Dentista", "Farmacêutico", "Fisioterapeuta", "Terapeuta Ocupacional",
        "Paramédico", "Cuidador", "Auxiliar de Saúde", "Enfermeiro de Saúde Mental",
        // Education
        "Professor", "Professor de Ensino Fundamental", "Professor de Ensino Médio",
        "Auxiliar de Ensino", "Tutor", "Professor Universitário", "Professor de Educação Especial",
        // Trades & Construction
        "Eletricista", "Encanador", "Carpinteiro", "Construtor", "Construtor Geral",
        "Pedreiro", "Rebocador", "Pintor e Decorador", "Telhador", "Engenheiro de Gás",
        "Engenheiro de Aquecimento", "Técnico de HVAC", "Soldador", "Montador de Andaimes",
        "Trabalhador de Terraplenagem", "Gerente de Construção", "Gerente de Obra",
        "Agrimensor de Quantidades", "Engenheiro Civil", "Engenheiro Estrutural",
        // Automotive
        "Mecânico", "Mecânico Automotivo", "Mecânico de Motores", "Técnico Automotivo", "Engenheiro Automotivo",
        // Hospitality & Catering
        "Chef", "Sous Chef", "Cozinheiro", "Bartender", "Garçom", "Garçonete",
        "Gerente de Restaurante", "Gerente de Hotel", "Governanta",
        // Retail & Customer Service
        "Gerente de Varejo", "Assistente de Loja", "Assistente de Vendas", "Caixa",
        "Representante de Atendimento ao Cliente", "Agente de Call Center",
        // Logistics & Transport
        "Motorista", "Motorista de Entrega", "Motorista de Caminhão", "Operador de Armazém",
        "Operador de Empilhadeira", "Coordenador de Logística", "Gerente de Cadeia de Suprimentos",
        // Legal
        "Advogado", "Paralegal", "Secretária Jurídica",
        // Administrative
        "Assistente Administrativo", "Gerente de Escritório", "Assistente Pessoal",
        "Secretária", "Recepcionista",
        // Other Services
        "Faxineiro", "Segurança", "Jardineiro", "Paisagista", "Cabeleireiro", "Barbeiro", "Esteticista",
      ]
    }

    return [
      // Tech & IT
      "Software Engineer", "Senior Software Engineer", "Full Stack Developer",
      "Frontend Developer", "Backend Developer", "Mobile Developer",
      "DevOps Engineer", "Data Scientist", "Data Analyst",
      "Database Administrator", "Systems Administrator", "Network Engineer",
      "Cybersecurity Specialist", "IT Support Specialist", "QA Engineer", "Cloud Architect",
      // Design & Creative
      "UX Designer", "UI Designer", "Graphic Designer", "Web Designer", "Product Designer",
      "Art Director", "Animator", "Video Editor", "Photographer", "Illustrator",
      // Business & Management
      "Product Manager", "Project Manager", "Business Analyst", "Management Consultant",
      "Operations Manager", "General Manager", "CEO", "COO", "Business Development Manager",
      // Sales & Marketing
      "Marketing Manager", "Digital Marketing Specialist", "Social Media Manager",
      "Content Writer", "Copywriter", "SEO Specialist", "Sales Manager",
      "Sales Representative", "Account Manager", "Brand Manager",
      // Finance & Accounting
      "Accountant", "Financial Analyst", "Financial Advisor", "Tax Advisor",
      "Auditor", "Bookkeeper", "Payroll Specialist",
      // Human Resources
      "HR Manager", "HR Specialist", "Recruiter", "Talent Acquisition Specialist",
      "Training and Development Manager",
      // Healthcare
      "Nurse", "Registered Nurse", "Nurse Practitioner", "Doctor", "General Practitioner",
      "Surgeon", "Dentist", "Pharmacist", "Physiotherapist", "Occupational Therapist",
      "Paramedic", "Care Worker", "Carer", "Support Worker", "Healthcare Assistant",
      "Mental Health Nurse",
      // Education
      "Teacher", "Primary School Teacher", "Secondary School Teacher",
      "Teaching Assistant", "Tutor", "Lecturer", "Professor", "Special Education Teacher",
      // Trades & Construction
      "Electrician", "Plumber", "Carpenter", "Builder", "General Builder",
      "Bricklayer", "Plasterer", "Painter and Decorator", "Roofer", "Gas Engineer",
      "Heating Engineer", "HVAC Technician", "Welder", "Scaffolder", "Groundworker",
      "Construction Manager", "Site Manager", "Quantity Surveyor", "Civil Engineer", "Structural Engineer",
      // Automotive
      "Mechanic", "Auto Mechanic", "Motor Mechanic", "Vehicle Technician", "Automotive Engineer",
      // Hospitality & Catering
      "Chef", "Sous Chef", "Cook", "Bartender", "Waiter", "Waitress",
      "Restaurant Manager", "Hotel Manager", "Housekeeper",
      // Retail & Customer Service
      "Retail Manager", "Shop Assistant", "Sales Assistant", "Cashier",
      "Customer Service Representative", "Call Centre Agent",
      // Logistics & Transport
      "Driver", "Delivery Driver", "HGV Driver", "Warehouse Operative",
      "Forklift Operator", "Logistics Coordinator", "Supply Chain Manager",
      // Legal
      "Solicitor", "Lawyer", "Paralegal", "Legal Secretary",
      // Administrative
      "Administrative Assistant", "Office Manager", "Personal Assistant", "Secretary", "Receptionist",
      // Other Services
      "Cleaner", "Security Guard", "Gardener", "Landscaper", "Hairdresser", "Barber", "Beautician",
    ]
  }

  // Define skill categories based on profession (locale-aware)
  const getRelevantSkills = (title: string): string[] => {
    const titleLower = title.toLowerCase()
    const isPtBR = locale === 'pt-BR'

    // Trade-specific skills
    const tradeSkills = isPtBR ? [
      // Electrical
      "Trabalho Elétrico", "Instalação Elétrica", "Teste Elétrico", "Normas de Instalação Elétrica",
      // Plumbing/Gas
      "Encanamento", "Instalação de Gás", "Instalador de Gás Certificado", "Sistemas de Aquecimento", "Instalação de Caldeira",
      // Construction
      "Carpintaria", "Marcenaria", "Alvenaria", "Reboco", "Revestimento", "Pintura e Decoração",
      "Telhado", "Azulejista", "Terraplenagem", "Andaime", "Soldagem",
      // Certifications
      "Certificação CREA", "Primeiros Socorros", "Saúde e Segurança", "NR-10", "NR-35", "Operação de Empilhadeira",
    ] : [
      // Electrical
      "Electrical Work", "Electrical Installation", "Electrical Testing", "18th Edition Wiring Regulations",
      // Plumbing/Gas
      "Plumbing", "Gas Fitting", "Gas Safe Registered", "Heating Systems", "Boiler Installation",
      // Construction
      "Carpentry", "Joinery", "Bricklaying", "Plastering", "Rendering", "Painting and Decorating",
      "Roofing", "Tiling", "Groundwork", "Scaffolding", "Welding",
      // Certifications
      "CSCS Card", "First Aid at Work", "Health and Safety", "SMSTS", "SSSTS", "Forklift Operation", "IPAF",
    ]

    const programmingSkills = isPtBR ? [
      "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "PHP", "Ruby", "Go", "Swift", "Kotlin", "Rust",
      "HTML", "CSS", "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express.js", "Django", "Flask",
      "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes",
      "Desenvolvimento Web", "Desenvolvimento Mobile", "Desenvolvimento Full Stack", "Backend", "Frontend",
    ] : [
      "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "PHP", "Ruby", "Go", "Swift", "Kotlin", "Rust",
      "HTML", "CSS", "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express.js", "Django", "Flask",
      "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes",
    ]

    const designSkills = isPtBR ? [
      "Photoshop", "Illustrator", "InDesign", "Figma", "Sketch", "Adobe XD", "After Effects", "Premiere Pro", "Canva",
      "AutoCAD", "SolidWorks", "Revit", "SketchUp", "Modelagem 3D", "Design Gráfico", "UX Design", "UI Design",
    ] : [
      "Photoshop", "Illustrator", "InDesign", "Figma", "Sketch", "Adobe XD", "After Effects", "Premiere Pro", "Canva",
      "AutoCAD", "SolidWorks", "Revit", "SketchUp", "3D Modeling",
    ]

    const businessSkills = isPtBR ? [
      "Microsoft Office", "Excel", "PowerPoint", "Word", "Google Workspace", "Análise de Dados", "Entrada de Dados",
      "Contabilidade", "QuickBooks", "Sage", "Xero",
      "Gerenciamento de Projetos", "Agile", "Scrum", "Jira", "Trello", "Asana",
      "Marketing Digital", "SEO", "Marketing de Mídias Sociais", "Marketing de Conteúdo", "Email Marketing",
    ] : [
      "Microsoft Office", "Excel", "PowerPoint", "Word", "Google Workspace", "Data Analysis", "Data Entry",
      "Bookkeeping", "QuickBooks", "Sage", "Xero",
      "Project Management", "Agile", "Scrum", "Jira", "Trello", "Asana",
      "Digital Marketing", "SEO", "Social Media Marketing", "Content Marketing", "Email Marketing",
    ]

    const healthcareSkills = isPtBR ? [
      "Cuidado ao Paciente", "Primeiros Socorros", "RCP", "Administração de Medicamentos", "Planejamento de Cuidados",
      "Movimentação e Manuseio", "Proteção", "Cuidados com Demência", "Apoio à Saúde Mental", "Habilidades Clínicas",
    ] : [
      "Patient Care", "First Aid", "CPR", "Medication Administration", "Care Planning",
      "Moving and Handling", "Safeguarding", "Dementia Care", "Mental Health Support", "Clinical Skills",
    ]

    const automotiveSkills = isPtBR ? [
      "Reparação Automotiva", "Diagnóstico de Motor", "Teste Veicular", "Manutenção Veicular", "Elétrica Automotiva", "Funilaria", "Pintura Automotiva",
    ] : [
      "Car Repair", "Engine Diagnostics", "MOT Testing", "Vehicle Maintenance", "Auto Electrical", "Bodywork", "Spray Painting",
    ]

    const softSkills = isPtBR ? [
      "Liderança", "Comunicação", "Trabalho em Equipe", "Resolução de Problemas", "Pensamento Crítico",
      "Gestão de Tempo", "Adaptabilidade", "Atendimento ao Cliente", "Atenção aos Detalhes", "Organização",
    ] : [
      "Leadership", "Communication", "Teamwork", "Problem Solving", "Critical Thinking",
      "Time Management", "Adaptability", "Customer Service", "Attention to Detail", "Organization",
    ]

    // Check if it's a trade profession (English and Portuguese keywords)
    if (titleLower.includes("electr") || titleLower.includes("elétr") || titleLower.includes("plumb") ||
        titleLower.includes("encan") || titleLower.includes("carpenter") || titleLower.includes("carpint") ||
        titleLower.includes("builder") || titleLower.includes("construt") || titleLower.includes("roofer") ||
        titleLower.includes("telha") || titleLower.includes("plaster") || titleLower.includes("reboc") ||
        titleLower.includes("painter") || titleLower.includes("pint") || titleLower.includes("decorator") ||
        titleLower.includes("brick") || titleLower.includes("alven") || titleLower.includes("gas") ||
        titleLower.includes("gás") || titleLower.includes("heating") || titleLower.includes("aquec") ||
        titleLower.includes("hvac") || titleLower.includes("welder") || titleLower.includes("solda") ||
        titleLower.includes("scaffold") || titleLower.includes("andaim")) {
      return [...tradeSkills, ...softSkills]
    }

    // Check if it's tech/programming (English and Portuguese keywords)
    if (titleLower.includes("develop") || titleLower.includes("desenvolv") || titleLower.includes("engineer") ||
        titleLower.includes("engenh") || titleLower.includes("program") || titleLower.includes("software") ||
        titleLower.includes("full stack") || titleLower.includes("frontend") || titleLower.includes("backend") ||
        titleLower.includes("devops")) {
      return [...programmingSkills, ...softSkills]
    }

    // Check if it's design (English and Portuguese keywords)
    if (titleLower.includes("design") || titleLower.includes("ux") || titleLower.includes("ui") ||
        titleLower.includes("graphic") || titleLower.includes("gráf") || titleLower.includes("creative") ||
        titleLower.includes("criativ")) {
      return [...designSkills, ...softSkills]
    }

    // Check if it's healthcare (English and Portuguese keywords)
    if (titleLower.includes("nurse") || titleLower.includes("enferm") || titleLower.includes("care") ||
        titleLower.includes("cuidado") || titleLower.includes("health") || titleLower.includes("saúde") ||
        titleLower.includes("medical") || titleLower.includes("médic") || titleLower.includes("doctor") ||
        titleLower.includes("doutor")) {
      return [...healthcareSkills, ...softSkills]
    }

    // Check if it's automotive (English and Portuguese keywords)
    if (titleLower.includes("mechanic") || titleLower.includes("mecân") || titleLower.includes("automotive") ||
        titleLower.includes("automotiv") || titleLower.includes("mot")) {
      return [...automotiveSkills, ...softSkills]
    }

    // Check if it's business/office (English and Portuguese keywords)
    if (titleLower.includes("manager") || titleLower.includes("gerente") || titleLower.includes("gestor") ||
        titleLower.includes("admin") || titleLower.includes("analyst") || titleLower.includes("analista") ||
        titleLower.includes("marketing") || titleLower.includes("sales") || titleLower.includes("venda") ||
        titleLower.includes("accountant") || titleLower.includes("contador")) {
      return [...businessSkills, ...softSkills]
    }

    // Default: show all categories
    return [...tradeSkills, ...programmingSkills, ...designSkills, ...businessSkills, ...healthcareSkills, ...automotiveSkills, ...softSkills]
  }

  // Update skill suggestions based on input and professional title
  useEffect(() => {
    if (newSkill.trim().length > 0) {
      const relevantSkills = getRelevantSkills(professionalData.title || "")
      const filtered = relevantSkills.filter(skill =>
        skill.toLowerCase().includes(newSkill.toLowerCase()) &&
        !professionalData.skills.includes(skill)
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredSkillSuggestions(filtered)
      setShowSkillSuggestions(filtered.length > 0)
    } else {
      setShowSkillSuggestions(false)
      setFilteredSkillSuggestions([])
    }
  }, [newSkill, professionalData.title, professionalData.skills])

  const addSkill = (skillToAdd?: string) => {
    const skill = skillToAdd !== undefined ? skillToAdd : newSkill
    if (skill && skill.trim() && !professionalData.skills.includes(skill.trim())) {
      setProfessionalData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill.trim()],
      }))
      setNewSkill("")
      setShowSkillSuggestions(false)
    }
  }

  const removeSkill = (skill: string) => {
    setProfessionalData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  // Get relevant service suggestions based on company industry (locale-aware)
  const getRelevantServices = (industry: string): string[] => {
    const industryLower = industry.toLowerCase()
    const isPtBR = locale === 'pt-BR'

    const constructionServices = isPtBR ? [
      "Construção Geral", "Construção Nova", "Reformas", "Ampliações",
      "Instalação Elétrica", "Reparos Elétricos", "Refiação", "Elétrica de Emergência",
      "Instalação Hidráulica", "Reparos Hidráulicos", "Instalação de Caldeira", "Aquecimento Central",
      "Instalação de Banheiro", "Instalação de Cozinha", "Carpintaria", "Marcenaria Personalizada",
      "Pintura Interna", "Pintura Externa", "Decoração", "Papel de Parede",
      "Reparos de Telhado", "Instalação de Telhado Novo", "Manutenção de Telhado", "Calhas",
      "Reboco", "Revestimento", "Drywall", "Trabalho de Teto",
      "Azulejista", "Instalação de Piso", "Alvenaria", "Terraplenagem",
    ] : [
      "General Construction", "New Build Construction", "Renovations", "Extensions",
      "Electrical Installation", "Electrical Repairs", "Rewiring", "Emergency Electrical",
      "Plumbing Installation", "Plumbing Repairs", "Boiler Installation", "Central Heating",
      "Bathroom Installation", "Kitchen Installation", "Carpentry", "Custom Joinery",
      "Painting Interior", "Painting Exterior", "Decorating", "Wallpapering",
      "Roofing Repairs", "New Roof Installation", "Roof Maintenance", "Guttering",
      "Plastering", "Rendering", "Drywall", "Ceiling Work",
      "Tiling", "Flooring Installation", "Bricklaying", "Groundwork",
    ]

    const techServices = isPtBR ? [
      "Desenvolvimento Web", "Desenvolvimento de Aplicativos Mobile", "Desenvolvimento de Software",
      "Suporte de TI", "Configuração de Rede", "Migração para Nuvem", "Cibersegurança",
      "Gerenciamento de Banco de Dados", "Integração de Sistemas", "Desenvolvimento de API",
      "Design UI/UX", "Design de Website", "Desenvolvimento de E-commerce",
      "Serviços de SEO", "Marketing Digital", "Gerenciamento de Mídias Sociais",
    ] : [
      "Web Development", "Mobile App Development", "Software Development",
      "IT Support", "Network Setup", "Cloud Migration", "Cybersecurity",
      "Database Management", "System Integration", "API Development",
      "UI/UX Design", "Website Design", "E-commerce Development",
      "SEO Services", "Digital Marketing", "Social Media Management",
    ]

    const healthcareServices = isPtBR ? [
      "Consulta Geral", "Avaliação de Saúde", "Planos de Tratamento",
      "Atendimento Domiciliar", "Cuidado Pessoal", "Cuidados de Enfermagem", "Gerenciamento de Medicamentos",
      "Fisioterapia", "Reabilitação Física", "Tratamento de Dor",
      "Aconselhamento de Saúde Mental", "Sessões de Terapia", "Programas de Bem-Estar",
      "Check-up Odontológico", "Limpeza Dental", "Tratamento Dental",
    ] : [
      "General Consultation", "Health Assessment", "Treatment Plans",
      "Home Care", "Personal Care", "Nursing Care", "Medication Management",
      "Physiotherapy", "Physical Rehabilitation", "Pain Management",
      "Mental Health Counseling", "Therapy Sessions", "Wellness Programs",
      "Dental Checkup", "Dental Cleaning", "Dental Treatment",
    ]

    const businessServices = isPtBR ? [
      "Consultoria Empresarial", "Desenvolvimento de Estratégia", "Pesquisa de Mercado",
      "Serviços Contábeis", "Escrituração Contábil", "Preparação de Impostos", "Serviços de Folha de Pagamento",
      "Consultoria Jurídica", "Revisão de Contratos", "Representação Legal",
      "Estratégia de Marketing", "Desenvolvimento de Marca", "Criação de Conteúdo",
      "Consultoria de RH", "Serviços de Recrutamento", "Programas de Treinamento",
    ] : [
      "Business Consulting", "Strategy Development", "Market Research",
      "Accounting Services", "Bookkeeping", "Tax Preparation", "Payroll Services",
      "Legal Advice", "Contract Review", "Legal Representation",
      "Marketing Strategy", "Brand Development", "Content Creation",
      "HR Consulting", "Recruitment Services", "Training Programs",
    ]

    const cleaningServices = isPtBR ? [
      "Limpeza Residencial", "Limpeza Profunda", "Limpeza Regular",
      "Limpeza de Escritório", "Limpeza Comercial", "Limpeza Fim de Locação",
      "Limpeza de Carpete", "Limpeza de Janelas", "Lavagem de Pressão",
    ] : [
      "House Cleaning", "Deep Cleaning", "Regular Cleaning",
      "Office Cleaning", "Commercial Cleaning", "End of Tenancy Cleaning",
      "Carpet Cleaning", "Window Cleaning", "Pressure Washing",
    ]

    const gardeningServices = isPtBR ? [
      "Manutenção de Jardim", "Corte de Grama", "Poda de Cerca Viva",
      "Design de Jardim", "Paisagismo", "Instalação de Pátio",
      "Cirurgia de Árvore", "Remoção de Tocos", "Instalação de Cerca",
    ] : [
      "Garden Maintenance", "Lawn Mowing", "Hedge Trimming",
      "Garden Design", "Landscaping", "Patio Installation",
      "Tree Surgery", "Stump Removal", "Fence Installation",
    ]

    const automotiveServices = isPtBR ? [
      "Manutenção de Carro", "Inspeção Veicular", "Reparos de Veículos",
      "Diagnóstico de Motor", "Reparos de Freio", "Instalação de Pneus",
      "Elétrica Automotiva", "Reparos de Funilaria", "Pintura Automotiva",
    ] : [
      "Car Servicing", "MOT Testing", "Vehicle Repairs",
      "Engine Diagnostics", "Brake Repairs", "Tyre Fitting",
      "Auto Electrical", "Bodywork Repairs", "Spray Painting",
    ]

    // Match industry to relevant services (English and Portuguese keywords)
    if (industryLower.includes("construction") || industryLower.includes("construção") ||
        industryLower.includes("building") || industryLower.includes("edif") ||
        industryLower.includes("electrical") || industryLower.includes("elétr") ||
        industryLower.includes("plumbing") || industryLower.includes("hidrául") ||
        industryLower.includes("carpentry") || industryLower.includes("carpint") ||
        industryLower.includes("painting") || industryLower.includes("pint") ||
        industryLower.includes("roofing") || industryLower.includes("telha") ||
        industryLower.includes("hvac")) {
      return constructionServices
    }

    if (industryLower.includes("technology") || industryLower.includes("tecnologia") ||
        industryLower.includes("software") || industryLower.includes("it ") ||
        industryLower.includes("web") || industryLower.includes("digital")) {
      return techServices
    }

    if (industryLower.includes("health") || industryLower.includes("saúde") ||
        industryLower.includes("medical") || industryLower.includes("médic") ||
        industryLower.includes("care") || industryLower.includes("cuidado") ||
        industryLower.includes("dental") || industryLower.includes("nursing") ||
        industryLower.includes("enferm")) {
      return healthcareServices
    }

    if (industryLower.includes("business") || industryLower.includes("negócio") ||
        industryLower.includes("consulting") || industryLower.includes("consultoria") ||
        industryLower.includes("accounting") || industryLower.includes("contabil") ||
        industryLower.includes("legal") || industryLower.includes("jurídic") ||
        industryLower.includes("marketing") || industryLower.includes("hr") ||
        industryLower.includes("rh")) {
      return businessServices
    }

    if (industryLower.includes("cleaning") || industryLower.includes("limpeza")) {
      return cleaningServices
    }

    if (industryLower.includes("garden") || industryLower.includes("jardim") ||
        industryLower.includes("landscaping") || industryLower.includes("paisag")) {
      return gardeningServices
    }

    if (industryLower.includes("automotive") || industryLower.includes("automotiv") ||
        industryLower.includes("vehicle") || industryLower.includes("veículo") ||
        industryLower.includes("mechanic") || industryLower.includes("mecân")) {
      return automotiveServices
    }

    // Default: show all services
    return [
      ...constructionServices,
      ...techServices,
      ...healthcareServices,
      ...businessServices,
      ...cleaningServices,
      ...gardeningServices,
      ...automotiveServices,
    ]
  }

  // Update service suggestions based on input and company industry
  useEffect(() => {
    if (newService.trim().length > 0) {
      const relevantServices = getRelevantServices(companyData.industry || "")
      const filtered = relevantServices.filter(service =>
        service.toLowerCase().includes(newService.toLowerCase()) &&
        !companyData.services.includes(service)
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredServiceSuggestions(filtered)
      setShowServiceSuggestions(filtered.length > 0)
    } else {
      setShowServiceSuggestions(false)
      setFilteredServiceSuggestions([])
    }
  }, [newService, companyData.industry, companyData.services])

  const handleLocationSelect = (lat: number, lng: number) => {
    setProfessionalData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }))
  }

  const handleLocationClear = () => {
    setProfessionalData((prev) => ({
      ...prev,
      latitude: null,
      longitude: null,
    }))
  }

  const handleCompanyLocationSelect = (lat: number, lng: number, address?: string) => {
    setCompanyData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: address || prev.location, // Set location text from address
    }))

    // Also store detailed location data if reverse geocoding provides it
    if (address) {
      setCompanyLocationData({
        address: address,
        latitude: lat,
        longitude: lng,
        formatted_address: address,
        city: "",
        country: "",
      })
    }
  }

  const handleCompanyLocationClear = () => {
    setCompanyData((prev) => ({
      ...prev,
      latitude: null,
      longitude: null,
      location: "", // Clear location text
    }))
    setCompanyLocationData(null)
  }

  const clearUserMetadata = async () => {
    try {
      // Clear Supabase user metadata
      const { error } = await supabase.auth.updateUser({
        data: { user_type: null }
      })

      if (error) {
        console.error("Error clearing user metadata:", error)
        return false
      }

      // Reset local state
      setUserType(null)
      setStep(1)

      // Clear professional data
      setProfessionalData({
        firstName: "",
        lastName: "",
        nickname: "",
        title: "",
        bio: "",
        experienceLevel: "mid" as "entry" | "mid" | "senior" | "lead" | "executive",
        skills: [] as string[],
        languages: [] as string[],
        portfolioUrl: "",
        websiteUrl: "",
        salaryMin: "",
        salaryMax: "",
        salaryFrequency: "per year" as "per year" | "per day" | "per hour",
        latitude: null as number | null,
        longitude: null as number | null,
        readyToRelocate: false,
        hasDrivingLicence: false,
        hasOwnTransport: false,
        employmentStatus: null as string | null,
        availability: "not_specified" as "available_now" | "available_week" | "available_month" | "not_specified",
        hidePersonalName: false,
      })

      // Clear company data
      setCompanyData({
        companyName: "",
        description: "",
        industry: "",
        companySize: "",
        websiteUrl: "",
        phoneNumber: "",
        registrationNumber: "",
        location: "",
        latitude: null as number | null,
        longitude: null as number | null,
        addressLine1: "",
        addressLine2: "",
        city: "",
        county: "",
        postcode: "",
        country: "",
        services: [],
        spokenLanguages: [],
        priceList: "",
        service24_7: false,
      })
      setNewService("")

      // Clear location data
      setProfessionalLocationData(null)
      setCompanyLocationData(null)

      console.log("User metadata cleared successfully")
      return true
    } catch (error) {
      console.error("Error clearing user metadata:", error)
      return false
    }
  }

  const geocodeAddress = async (houseNumber: string, postcode: string, country: string) => {
    if (!houseNumber || !postcode) return null

    try {
      const address = `${houseNumber} ${postcode} ${country}`
      // This is a simplified geocoding - in production you might want to use a proper geocoding service
      // For now, we'll set some basic coordinates based on country
      const countryCoordinates: Record<string, { lat: number; lng: number; city: string }> = {
        'GB': { lat: 51.5074, lng: -0.1278, city: 'London' },
        'US': { lat: 40.7128, lng: -74.0060, city: 'New York' },
        'CA': { lat: 43.6532, lng: -79.3832, city: 'Toronto' },
        'AU': { lat: -33.8688, lng: 151.2093, city: 'Sydney' },
        'DE': { lat: 52.5200, lng: 13.4050, city: 'Berlin' },
        'FR': { lat: 48.8566, lng: 2.3522, city: 'Paris' },
        'ES': { lat: 40.4168, lng: -3.7038, city: 'Madrid' },
        'IT': { lat: 41.9028, lng: 12.4964, city: 'Rome' },
        'NL': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam' },
        'SE': { lat: 59.3293, lng: 18.0686, city: 'Stockholm' },
        'NO': { lat: 59.9139, lng: 10.7522, city: 'Oslo' },
        'DK': { lat: 55.6761, lng: 12.5683, city: 'Copenhagen' },
        'BR': { lat: -23.5505, lng: -46.6333, city: 'São Paulo' },
        'RU': { lat: 55.7558, lng: 37.6176, city: 'Moscow' },
        'IN': { lat: 28.6139, lng: 77.2090, city: 'New Delhi' },
      }

      const coords = countryCoordinates[country] || countryCoordinates['GB']
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        city: coords.city,
        country: country,
        formatted_address: address
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  const handleSubmit = async () => {
    if (!userType) return

    // Clear any previous errors
    setError(null)

    // Validate form data before submission
    if (userType === "professional") {
      if (!professionalData.firstName || !professionalData.lastName) {
        setError({
          title: "Missing required fields",
          message: "Please enter your first name and last name."
        })
        return
      }

      // If user wants to hide personal name, require a nickname
      if (professionalData.hidePersonalName && !professionalData.nickname) {
        setError({
          title: "Nickname required",
          message: "Please enter a nickname to use instead of your real name."
        })
        return
      }

      if (!professionalData.latitude || !professionalData.longitude) {
        setError({
          title: "Location required",
          message: "Please select your location on the map. This helps employers find you."
        })
        return
      }

      // Validate salary range
      if (professionalData.salaryMin && professionalData.salaryMax) {
        const min = Number.parseInt(professionalData.salaryMin)
        const max = Number.parseInt(professionalData.salaryMax)
        if (min > max) {
          setError({
            title: "Invalid salary range",
            message: "Minimum salary cannot be greater than maximum salary."
          })
          return
        }
      }
    }

    if (userType === "company") {
      if (!companyData.companyName) {
        setError({
          title: "Missing required field",
          message: "Please enter your company name."
        })
        return
      }
      if (!companyData.industry) {
        setError({
          title: "Missing required field",
          message: "Please enter your company's industry."
        })
        return
      }

      if (!companyData.latitude || !companyData.longitude) {
        setError({
          title: "Location required",
          message: "Please pin your location on the map."
        })
        return
      }
    }

    setLoading(true)

    try {
      console.log("Starting form submission...", {
        userType,
        professionalData: userType === "professional" ? professionalData : null,
        companyData: userType === "company" ? companyData : null
      })

      // First, create the user record with nickname, coordinates, and privacy defaults
      const userData: any = {
        id: user.id,
        email: user.email,
        user_type: userType,
        nickname: userType === "professional" ? professionalData.nickname || null : null,
        latitude: userType === "professional" ? professionalData.latitude : null,
        longitude: userType === "professional" ? professionalData.longitude : null,
      }

      // Set phone visibility to private by default for professionals
      if (userType === "professional") {
        userData.phone_visible = false
      }

      console.log("Upserting user data:", userData)

      // Try direct upsert without timeout to see actual error
      const { data: upsertData, error: userError } = await supabase
        .from("users")
        .upsert(userData, {
          onConflict: "id"
        })
        .select()

      console.log("User upsert result:", { data: upsertData, error: userError })

      if (userError) {
        console.error("User upsert error details:", {
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code
        })

        // If it's a permission error, try insert instead
        if (userError.code === '42501' || userError.message?.includes('permission') || userError.message?.includes('policy')) {
          console.log("Permission error detected, trying insert instead...")
          const { data: insertData, error: insertError } = await supabase
            .from("users")
            .insert(userData)
            .select()

          console.log("User insert result:", { data: insertData, error: insertError })

          if (insertError) {
            console.error("User insert also failed:", insertError)
            throw insertError
          }
        } else {
          throw userError
        }
      }

      console.log("User record created successfully")

      if (userType === "professional") {
        // Create professional profile with privacy-first defaults
        const profileData: any = {
          user_id: user.id,
          first_name: professionalData.firstName,
          last_name: professionalData.lastName,
          nickname: professionalData.nickname || null,
          title: professionalData.title,
          bio: professionalData.bio,
          experience_level: professionalData.experienceLevel,
          skills: professionalData.skills,
          spoken_languages: professionalData.languages, // FIXED: Match profile edit field name
          portfolio_url: professionalData.portfolioUrl || null,
          website_url: professionalData.websiteUrl || null,
          salary_min: professionalData.salaryMin ? Number.parseInt(professionalData.salaryMin) : null,
          salary_max: professionalData.salaryMax ? Number.parseInt(professionalData.salaryMax) : null,
          salary_frequency: professionalData.salaryFrequency,
          ready_to_relocate: professionalData.readyToRelocate,
          valid_driving_license: professionalData.hasDrivingLicence, // FIXED: Match profile edit field name
          own_transport: professionalData.hasOwnTransport, // FIXED: Match profile edit field name
          // FIXED: Split employment_status into separate boolean fields
          employed_open_to_offers: professionalData.employmentStatus === 'employed',
          unemployed_seeking: professionalData.employmentStatus === 'unemployed',
          availability: professionalData.availability,
          latitude: professionalData.latitude,
          longitude: professionalData.longitude,
          // Privacy defaults - protect user information by default
          hide_email: true, // Hide email by default
          hide_personal_name: professionalData.hidePersonalName, // Use user's choice from onboarding
          hide_address_details: true, // Show only city, hide street address
          hide_bio: false, // Show bio - needed for search visibility
          hide_professional_title: false, // Show title - needed for search visibility
          hide_portfolio_links: false, // Show links - professionals want to showcase work
        }

        console.log("Professional profile data:", profileData)
        console.log("Employment status value:", professionalData.employmentStatus, "Type:", typeof professionalData.employmentStatus)

        console.log("Attempting professional profile upsert...")

        // Try direct upsert without timeout
        const { data: profileUpsertData, error: upsertError } = await supabase
          .from("professional_profiles")
          .upsert(profileData, {
            onConflict: "user_id"
          })
          .select()

        console.log("Professional profile upsert result:", { data: profileUpsertData, error: upsertError })

        if (upsertError) {
          console.error("Professional profile upsert error details:", {
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
            code: upsertError.code
          })

          // If unique constraint doesn't exist, try insert
          if (upsertError.message?.includes("no unique or exclusion constraint")) {
            console.log("Unique constraint not found, trying insert...")

            const { data: profileInsertData, error: insertError } = await supabase
              .from("professional_profiles")
              .insert(profileData)
              .select()

            console.log("Professional profile insert result:", { data: profileInsertData, error: insertError })

            if (insertError) {
              console.error("Professional profile insert error:", insertError)
              throw insertError
            }
          } else {
            throw upsertError
          }
        }

        console.log("Professional profile created successfully")
        // Clear localStorage draft after successful submission
        localStorage.removeItem(`onboarding_professional_${user.id}`)
        router.push("/dashboard/professional")
      } else {
        // Create company profile
        // Build full_address from address fields
        const addressParts = [
          companyData.addressLine1,
          companyData.addressLine2,
          companyData.city,
          companyData.county,
          companyData.postcode,
          companyData.country
        ].filter(Boolean)
        const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null

        // Auto-generate location from reverse geocoding or use a default
        let displayLocation = "Location on map"
        if (companyLocationData?.city && companyLocationData?.country) {
          displayLocation = `${companyLocationData.city}, ${companyLocationData.country}`
        } else if (companyLocationData?.city) {
          displayLocation = companyLocationData.city
        }

        const profileData: any = {
          user_id: user.id,
          company_name: companyData.companyName,
          description: companyData.description,
          industry: companyData.industry,
          company_size: companyData.companySize,
          website_url: companyData.websiteUrl || null,
          phone_number: companyData.phoneNumber || null,
          registration_number: companyData.registrationNumber || null,
          location: displayLocation,
          full_address: fullAddress,
          latitude: companyData.latitude,
          longitude: companyData.longitude,
          services: companyData.services.length > 0 ? companyData.services : null,
          spoken_languages: companyData.spokenLanguages.length > 0 ? companyData.spokenLanguages : null,
          price_list: companyData.priceList || null,
          service_24_7: companyData.service24_7,
        }

        // Add detailed location data from reverse geocoding if available
        if (companyLocationData) {
          if (companyLocationData.city) profileData.city = companyLocationData.city
          if (companyLocationData.country) profileData.country = companyLocationData.country
          if (companyLocationData.formatted_address) {
            profileData.formatted_address = companyLocationData.formatted_address
          }
        }

        console.log("Creating company profile with data:", {
          company_name: profileData.company_name,
          industry: profileData.industry,
          location: profileData.location,
          registration_number: profileData.registration_number,
          hasLatLng: !!(profileData.latitude && profileData.longitude),
        })

        // Try upsert first, fallback to insert if unique constraint doesn't exist yet
        let profileError: any = null

        console.log("Attempting company profile upsert...")

        // First try upsert (works after migration)
        const companyUpsertPromise = supabase
          .from("company_profiles")
          .upsert(profileData, {
            onConflict: "user_id"
          })

        const upsertResult = await Promise.race([
          companyUpsertPromise,
          new Promise<{ error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Company profile upsert timed out after 30 seconds')), 30000)
          )
        ])

        const upsertError = upsertResult.error

        if (upsertError && upsertError.message?.includes("no unique or exclusion constraint")) {
          // Fallback to insert if unique constraint doesn't exist (before migration)
          console.log("Unique constraint not found, trying insert...")

          const insertPromise = supabase
            .from("company_profiles")
            .insert(profileData)

          const insertResult = await Promise.race([
            insertPromise,
            new Promise<{ error: Error }>((_, reject) =>
              setTimeout(() => reject(new Error('Company profile insert timed out after 30 seconds')), 30000)
            )
          ])

          profileError = insertResult.error
        } else {
          profileError = upsertError
        }

        if (profileError) {
          console.error("Company profile upsert error:", profileError)
          throw profileError
        }

        console.log("Company profile created successfully")
        // Clear localStorage draft after successful submission
        localStorage.removeItem(`onboarding_company_${user.id}`)
        router.push("/dashboard/company")
      }
    } catch (error: any) {
      console.error("Onboarding error details:", {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })

      let errorMessage = "Something went wrong. Please try again."
      let detailedMessage = ""

      if (error?.message) {
        if (error.message.includes("timed out")) {
          errorMessage = "The operation took too long to complete. This might be a network issue or the database is slow."
          detailedMessage = "Please check your internet connection and try again. If the problem persists, contact support."
        } else if (error.message.includes("column") && error.message.includes("does not exist")) {
          errorMessage = "Database schema error detected. Please contact support to run the required database migration."
          detailedMessage = "The database needs to be updated with missing columns for the onboarding process."
        } else if (error.code === "23505") {
          errorMessage = "A profile with this information already exists. Please contact support if you need to update your existing profile."
        } else if (error.code === "23503") {
          errorMessage = "Database constraint error. Please try again or contact support."
        } else if (error.code === "23514" || error.message.includes("check constraint")) {
          // Check constraint violation
          if (error.message.includes("employment_status")) {
            errorMessage = "Invalid employment status selected."
            detailedMessage = "Please select a valid employment status from the dropdown menu or leave it empty."
          } else if (error.message.includes("availability")) {
            errorMessage = "Invalid availability status selected."
            detailedMessage = "Please select one of the availability options provided."
          } else if (error.message.includes("salary")) {
            errorMessage = "Invalid salary values."
            detailedMessage = "Please ensure minimum salary is less than maximum salary, and both are positive numbers."
          } else {
            errorMessage = "One or more fields contain invalid values."
            detailedMessage = "Please check all form fields and ensure they contain valid data."
          }
        } else if (error.code === "42703") {
          errorMessage = "Database schema is missing required columns. Please contact support to run the database migration."
          detailedMessage = "Error code: 42703 - Column does not exist"
        } else {
          errorMessage = `Error: ${error.message}`
        }
      } else if (error?.code) {
        errorMessage = `Database error (${error.code}). Please contact support if this persists.`
      }

      console.error("Final error message:", errorMessage)
      if (detailedMessage) {
        console.error("Additional details:", detailedMessage)
      }

      // Set error state for UI display
      setError({
        title: errorMessage,
        message: detailedMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      })

      if (error) {
        console.error("Failed to resend verification:", error)
        alert("Failed to resend verification email. Please try again.")
      } else {
        alert("Verification email sent! Please check your inbox and spam folder.")
      }
    } catch (error) {
      console.error("Unexpected error:", error)
      alert("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {showResetOption && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-800">Profile Setup Issue Detected</h3>
                <p className="mt-1 text-sm text-blue-700">
                  We detected some inconsistencies with your profile setup. You can start over with a clean slate.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearUserMetadata}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100 bg-transparent"
                  >
                    Start Over
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResetOption(false)}
                    className="text-blue-600"
                  >
                    Continue Anyway
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(isVerificationPending || !isEmailVerified) && !verificationReminderDismissed && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-800">Email Verification Pending</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Your account was created successfully, but your email address hasn't been verified yet. Some features
                  may be limited until you verify your email.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResendVerification}
                    className="text-amber-700 border-amber-300 hover:bg-amber-100 bg-transparent"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Resend verification email
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setVerificationReminderDismissed(true)}
                    className="text-amber-600"
                  >
                    Remind me later
                  </Button>
                </div>
                <div className="mt-2 text-xs text-amber-600">
                  <strong>Tip:</strong> Check your spam folder if you don't see the email within a few minutes.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary rounded-full">
            <Briefcase className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('auth.welcome')} Open Job Market</h1>
        <p className="text-muted-foreground">{t('onboardingFlow.tellUsAboutYou')}</p>
      </div>

      {/* Step 1: Choose user type */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('onboardingFlow.whatAreYou')}</CardTitle>
            <CardDescription>{t('onboardingFlow.chooseUserType')}</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={userType || ""}
              onValueChange={(value) => setUserType(value as "professional" | "company")}
              className="grid grid-cols-1 gap-4"
            >
              <div>
                <RadioGroupItem value="professional" id="professional" className="peer sr-only" />
                <Label
                  htmlFor="professional"
                  className="flex items-center space-x-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Briefcase className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">{t('onboardingFlow.professionalTitle')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('onboardingFlow.professionalDesc')}
                    </div>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="company" id="company" className="peer sr-only" />
                <Label
                  htmlFor="company"
                  className="flex items-center space-x-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Building className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">{t('onboardingFlow.companyTitle')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('onboardingFlow.companyDesc')}
                    </div>
                  </div>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="homeowner" id="homeowner" className="peer sr-only" />
                <Label
                  htmlFor="homeowner"
                  className="flex items-center space-x-4 rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Home className="h-8 w-8" />
                  <div>
                    <div className="font-semibold">{t('onboardingFlow.homeownerTitle')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('onboardingFlow.homeownerDesc')}
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex justify-end mt-6">
              <Button onClick={() => userType && handleUserTypeSelection(userType)} disabled={!userType}>
                {t('onboardingFlow.continue')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Professional Profile */}
      {step === 2 && userType === "professional" && (
        <Card>
          <CardHeader>
            <CardTitle>{t('onboardingFlow.professionalProfile')}</CardTitle>
            <CardDescription>{t('onboardingFlow.professionalProfileDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error message display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">{error.title}</h4>
                    {error.message && (
                      <p className="text-sm text-red-700">{error.message}</p>
                    )}
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      {t('onboardingFlow.dismiss')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Info message about pre-filled data */}
            {dataPreFilled && (professionalData.firstName || professionalData.lastName || professionalData.latitude) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>✓ {t('onboardingFlow.goodNews')}</strong> {t('onboardingFlow.preFilledInfo')}
                </p>
              </div>
            )}

            {/* Anonymous Jobseeker Checkbox */}
            <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:border-green-400 transition-colors">
              <Checkbox
                id="hidePersonalName"
                checked={professionalData.hidePersonalName}
                onCheckedChange={(checked) => setProfessionalData((prev) => ({ ...prev, hidePersonalName: checked as boolean }))}
                className="h-5 w-5 mt-0.5 rounded border-2 border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
              />
              <div className="flex-1">
                <Label htmlFor="hidePersonalName" className="text-base font-semibold cursor-pointer text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  {t('onboardingFlow.anonymousJobseeker')}
                </Label>
                <p className="text-sm text-gray-700 mt-1">
                  {t('onboardingFlow.anonymousJobseekerDesc')}
                </p>
                {professionalData.hidePersonalName && (
                  <div className="mt-3 p-3 bg-white border border-green-300 rounded-md">
                    <Label htmlFor="nickname" className="text-sm font-semibold text-gray-900">
                      {t('onboardingFlow.nickname')} *
                    </Label>
                    <Input
                      id="nickname"
                      value={professionalData.nickname}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, nickname: e.target.value }))}
                      placeholder={t('onboardingFlow.nicknamePlaceholder')}
                      className="mt-2 border-2"
                      required={professionalData.hidePersonalName}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {t('onboardingFlow.nicknameDesc')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg shadow-sm bg-white space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-semibold">{t('onboardingFlow.firstName')} *</Label>
                  <Input
                    id="firstName"
                    value={professionalData.firstName}
                    onChange={(e) => setProfessionalData((prev) => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-semibold">{t('onboardingFlow.lastName')} *</Label>
                  <Input
                    id="lastName"
                    value={professionalData.lastName}
                    onChange={(e) => setProfessionalData((prev) => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="border-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="title" className="font-semibold">{t('onboardingFlow.title')}</Label>
              <Input
                id="title"
                placeholder={t('onboardingFlow.titlePlaceholder')}
                value={professionalData.title}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, title: e.target.value }))}
                list="job-titles-list"
                className="border-2"
              />
              <datalist id="job-titles-list">
                {getJobTitles().map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="bio" className="font-semibold">{t('onboardingFlow.bio')}</Label>
              <Textarea
                id="bio"
                placeholder={t('onboardingFlow.bioPlaceholder')}
                value={professionalData.bio}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, bio: e.target.value }))}
                rows={4}
                className="border-2"
              />
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.location')} *</Label>
              <p className="text-sm text-muted-foreground">
                {t('onboardingFlow.locationDesc')}
              </p>
              {professionalData.latitude && professionalData.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                  <p className="text-xs text-green-800">
                    ✓ {t('onboardingFlow.locationSelected')}
                  </p>
                </div>
              )}
              <LocationPicker
                latitude={professionalData.latitude || undefined}
                longitude={professionalData.longitude || undefined}
                onLocationSelect={handleLocationSelect}
                onLocationClear={handleLocationClear}
              />
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.experienceLevel')}</Label>
              <RadioGroup
                value={professionalData.experienceLevel}
                onValueChange={(value) =>
                  setProfessionalData((prev) => ({
                    ...prev,
                    experienceLevel: value as typeof prev.experienceLevel,
                  }))
                }
                className="flex flex-wrap gap-4"
              >
                {[
                  { value: "entry", label: t('onboardingFlow.entry') },
                  { value: "mid", label: t('onboardingFlow.mid') },
                  { value: "senior", label: t('onboardingFlow.senior') },
                  { value: "lead", label: t('onboardingFlow.lead') },
                  { value: "executive", label: t('onboardingFlow.executive') },
                ].map((level) => (
                  <div key={level.value} className="flex items-center space-x-2 p-2 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <RadioGroupItem value={level.value} id={level.value} className="border-2" />
                    <Label htmlFor={level.value} className="cursor-pointer font-medium">{level.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.skills')}</Label>
              <div className="flex gap-2 relative">
                <div className="flex-1 relative">
                  <Input
                    placeholder={t('onboardingFlow.skillsPlaceholder')}
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    onFocus={() => newSkill.trim().length > 0 && setShowSkillSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
                    className="border-2"
                  />
                  {/* Custom dropdown positioned above input to avoid covering it */}
                  {showSkillSuggestions && filteredSkillSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-60 overflow-y-auto bg-white border-2 border-blue-500 rounded-lg shadow-lg z-50">
                      {filteredSkillSuggestions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="button" onClick={() => addSkill()} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {professionalData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.languages')}</Label>
              <LanguageSelector
                selectedLanguages={professionalData.languages}
                onChange={(languages) => setProfessionalData((prev) => ({ ...prev, languages }))}
              />
            </div>

            {/* Website URL */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="websiteUrl" className="font-semibold">{t('onboardingFlow.websiteUrl')}</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder={t('onboardingFlow.websiteUrlPlaceholder')}
                value={professionalData.websiteUrl}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    setProfessionalData((prev) => ({ ...prev, websiteUrl: `https://${value}` }))
                  }
                }}
                className="border-2"
              />
              <p className="text-xs text-muted-foreground">
                {t('onboardingFlow.websiteUrlDesc')}
              </p>
            </div>

            {/* Employment Status */}
            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="employmentStatus" className="font-semibold">{t('onboardingFlow.employmentStatus')}</Label>
              <Select
                value={professionalData.employmentStatus ?? undefined}
                onValueChange={(value) => setProfessionalData((prev) => ({ ...prev, employmentStatus: value || null }))}
              >
                <SelectTrigger className="border-2">
                  <SelectValue placeholder={t('onboardingFlow.employmentStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">{t('onboardingFlow.employed')}</SelectItem>
                  <SelectItem value="unemployed">{t('onboardingFlow.unemployed')}</SelectItem>
                  <SelectItem value="self_employed">{t('onboardingFlow.selfEmployed')}</SelectItem>
                  <SelectItem value="student">{t('onboardingFlow.student')}</SelectItem>
                  <SelectItem value="freelancer">{t('onboardingFlow.freelancer')}</SelectItem>
                  <SelectItem value="contractor">{t('onboardingFlow.contractor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.availability')}</Label>
              <RadioGroup
                value={professionalData.availability}
                onValueChange={(value) =>
                  setProfessionalData((prev) => ({
                    ...prev,
                    availability: value as typeof prev.availability,
                  }))
                }
                className="flex flex-col gap-2"
              >
                {[
                  { value: "available_now", label: t('onboardingFlow.availableNow') },
                  { value: "available_week", label: t('onboardingFlow.availableWeek') },
                  { value: "available_month", label: t('onboardingFlow.availableMonth') },
                  { value: "not_specified", label: t('onboardingFlow.notSpecified') },
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <RadioGroupItem value={option.value} id={`avail-${option.value}`} className="border-2 w-5 h-5" />
                    <Label htmlFor={`avail-${option.value}`} className="cursor-pointer font-medium flex-1">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Additional Information Checkboxes */}
            <div className="space-y-3 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.additionalInfo')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="readyToRelocate"
                    checked={professionalData.readyToRelocate}
                    onChange={(e) =>
                      setProfessionalData((prev) => ({ ...prev, readyToRelocate: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-2 border-gray-300"
                  />
                  <Label htmlFor="readyToRelocate" className="font-medium cursor-pointer flex-1">
                    {t('onboardingFlow.readyToRelocate')}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="hasDrivingLicence"
                    checked={professionalData.hasDrivingLicence}
                    onChange={(e) =>
                      setProfessionalData((prev) => ({ ...prev, hasDrivingLicence: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-2 border-gray-300"
                  />
                  <Label htmlFor="hasDrivingLicence" className="font-medium cursor-pointer flex-1">
                    {t('onboardingFlow.hasDrivingLicence')}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    id="hasOwnTransport"
                    checked={professionalData.hasOwnTransport}
                    onChange={(e) =>
                      setProfessionalData((prev) => ({ ...prev, hasOwnTransport: e.target.checked }))
                    }
                    className="h-5 w-5 rounded border-2 border-gray-300"
                  />
                  <Label htmlFor="hasOwnTransport" className="font-medium cursor-pointer flex-1">
                    {t('onboardingFlow.hasOwnTransport')}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-white">
              <Label className="font-semibold">{t('onboardingFlow.salaryRange')}</Label>

              {/* Frequency selector first */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('onboardingFlow.selectFrequency')}</Label>
                <Select
                  value={professionalData.salaryFrequency}
                  onValueChange={(value) => {
                    setProfessionalData((prev) => ({
                      ...prev,
                      salaryFrequency: value as typeof prev.salaryFrequency,
                      // Reset salary values when frequency changes to avoid confusion
                      salaryMin: "",
                      salaryMax: ""
                    }))
                  }}
                >
                  <SelectTrigger className="border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per year">{t('onboardingFlow.perYear')}</SelectItem>
                    <SelectItem value="per day">{t('onboardingFlow.perDay')}</SelectItem>
                    <SelectItem value="per hour">{t('onboardingFlow.perHour')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dual-handle range slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-600">
                    £{professionalData.salaryMin || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">to</span>
                  <span className="text-sm font-semibold text-blue-600">
                    £{professionalData.salaryMax ||
                      (professionalData.salaryFrequency === "per hour" ? 100 :
                       professionalData.salaryFrequency === "per day" ? 500 :
                       200000)}
                  </span>
                </div>

                {/* Dual range slider container */}
                <div className="relative pt-2 pb-6">
                  {/* Background track */}
                  <div className="absolute w-full h-2 bg-gray-200 rounded-lg top-2"></div>

                  {/* Active range highlight */}
                  <div
                    className="absolute h-2 bg-blue-600 rounded-lg top-2"
                    style={{
                      left: `${((Number(professionalData.salaryMin) || 0) / (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )) * 100}%`,
                      right: `${100 - ((Number(professionalData.salaryMax) || (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )) / (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )) * 100}%`
                    }}
                  ></div>

                  {/* Minimum slider */}
                  <input
                    type="range"
                    min="0"
                    max={
                      professionalData.salaryFrequency === "per hour" ? 100 :
                      professionalData.salaryFrequency === "per day" ? 500 :
                      200000
                    }
                    step={
                      professionalData.salaryFrequency === "per hour" ? 1 :
                      professionalData.salaryFrequency === "per day" ? 10 :
                      1000
                    }
                    value={professionalData.salaryMin || 0}
                    onChange={(e) => {
                      const newMin = Number(e.target.value)
                      const currentMax = Number(professionalData.salaryMax) || (
                        professionalData.salaryFrequency === "per hour" ? 100 :
                        professionalData.salaryFrequency === "per day" ? 500 :
                        200000
                      )
                      if (newMin <= currentMax) {
                        setProfessionalData((prev) => ({ ...prev, salaryMin: e.target.value }))
                      }
                    }}
                    className="absolute w-full appearance-none bg-transparent pointer-events-none top-2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                    style={{ zIndex: professionalData.salaryMin ? 4 : 3 }}
                  />

                  {/* Maximum slider */}
                  <input
                    type="range"
                    min="0"
                    max={
                      professionalData.salaryFrequency === "per hour" ? 100 :
                      professionalData.salaryFrequency === "per day" ? 500 :
                      200000
                    }
                    step={
                      professionalData.salaryFrequency === "per hour" ? 1 :
                      professionalData.salaryFrequency === "per day" ? 10 :
                      1000
                    }
                    value={professionalData.salaryMax || (
                      professionalData.salaryFrequency === "per hour" ? 100 :
                      professionalData.salaryFrequency === "per day" ? 500 :
                      200000
                    )}
                    onChange={(e) => {
                      const newMax = Number(e.target.value)
                      const currentMin = Number(professionalData.salaryMin) || 0
                      if (newMax >= currentMin) {
                        setProfessionalData((prev) => ({ ...prev, salaryMax: e.target.value }))
                      }
                    }}
                    className="absolute w-full appearance-none bg-transparent pointer-events-none top-2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
                    style={{ zIndex: professionalData.salaryMax ? 5 : 3 }}
                  />
                </div>
              </div>

              {/* Manual input option */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">{t('onboardingFlow.orEnterManually')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMinManual" className="text-xs text-muted-foreground">{t('onboardingFlow.minimum')}</Label>
                    <Input
                      id="salaryMinManual"
                      type="number"
                      placeholder={
                        professionalData.salaryFrequency === "per hour" ? "15" :
                        professionalData.salaryFrequency === "per day" ? "150" :
                        "30000"
                      }
                      value={professionalData.salaryMin}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, salaryMin: e.target.value }))}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMaxManual" className="text-xs text-muted-foreground">{t('onboardingFlow.maximum')}</Label>
                    <Input
                      id="salaryMaxManual"
                      type="number"
                      placeholder={
                        professionalData.salaryFrequency === "per hour" ? "50" :
                        professionalData.salaryFrequency === "per day" ? "300" :
                        "80000"
                      }
                      value={professionalData.salaryMax}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, salaryMax: e.target.value }))}
                      className="border-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-4 border rounded-lg shadow-sm bg-white">
              <Label htmlFor="portfolioUrl" className="font-semibold">{t('onboardingFlow.portfolioUrl')}</Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder={t('onboardingFlow.portfolioUrlPlaceholder')}
                value={professionalData.portfolioUrl}
                onChange={(e) => setProfessionalData((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    setProfessionalData((prev) => ({ ...prev, portfolioUrl: `https://${value}` }))
                  }
                }}
                className="border-2"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={loading || !professionalData.firstName || !professionalData.lastName}
              >
                {loading ? t('onboardingFlow.creatingProfile') : t('onboardingFlow.completeSetup')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Company Profile */}
      {step === 2 && userType === "company" && (
        <Card>
          <CardHeader>
            <CardTitle>{t('onboardingFlow.companyProfile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error message display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">{error.title}</h4>
                    {error.message && (
                      <p className="text-sm text-red-700">{error.message}</p>
                    )}
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                    >
                      {t('onboardingFlow.dismiss')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Info message about pre-filled data */}
            {dataPreFilled && (companyData.companyName || companyData.latitude) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>✓ {t('onboardingFlow.goodNews')}</strong> {t('onboardingFlow.preFilledInfo')}
                </p>
              </div>
            )}

            {/* Required Section */}
            <div className="space-y-6 pb-6 border-b">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-base font-semibold">
                  {t('onboardingFlow.companyName')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={companyData.companyName}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, companyName: e.target.value }))}
                  required
                  className="border-2"
                />
              </div>

              {/* Map Location Picker - Required */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {t('onboardingFlow.pinLocation')} <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('onboardingFlow.pinLocationDesc')}
                </p>
                {companyData.latitude && companyData.longitude ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">
                      <strong>✓ {t('onboardingFlow.locationPinned')}</strong>
                      {companyLocationData?.city && companyLocationData?.country && (
                        <span className="block mt-1 text-xs">
                          📍 {companyLocationData.city}, {companyLocationData.country}
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠ {t('onboardingFlow.pleasePin')}</strong>
                    </p>
                  </div>
                )}
                <LocationPicker
                  latitude={companyData.latitude || undefined}
                  longitude={companyData.longitude || undefined}
                  onLocationSelect={handleCompanyLocationSelect}
                  onLocationClear={handleCompanyLocationClear}
                />
              </div>
            </div>

            {/* Industry - Required */}
            <div className="space-y-2 pb-6 border-b">
              <Label htmlFor="industry" className="text-base font-semibold">{t('onboardingFlow.industry')} <span className="text-red-500">*</span></Label>
              <Input
                id="industry"
                placeholder={t('onboardingFlow.industryPlaceholder')}
                value={companyData.industry}
                onChange={(e) => setCompanyData((prev) => ({ ...prev, industry: e.target.value }))}
                list="industry-list"
                required
                className="border-2"
              />
              <datalist id="industry-list">
                {/* Construction & Trades */}
                <option value="Construction" />
                <option value="Building & Construction" />
                <option value="Electrical Services" />
                <option value="Plumbing & Heating" />
                <option value="Carpentry & Joinery" />
                <option value="Painting & Decorating" />
                <option value="Roofing" />
                <option value="HVAC Services" />
                <option value="General Contracting" />

                {/* Technology */}
                <option value="Information Technology" />
                <option value="Software Development" />
                <option value="IT Services & Consulting" />
                <option value="Cybersecurity" />
                <option value="Cloud Services" />
                <option value="Web Development" />
                <option value="Mobile App Development" />

                {/* Healthcare */}
                <option value="Healthcare" />
                <option value="Medical Services" />
                <option value="Dental Care" />
                <option value="Mental Health Services" />
                <option value="Home Care Services" />
                <option value="Nursing Services" />
                <option value="Physiotherapy" />

                {/* Business Services */}
                <option value="Business Consulting" />
                <option value="Accounting & Finance" />
                <option value="Legal Services" />
                <option value="Marketing & Advertising" />
                <option value="Human Resources" />
                <option value="Recruitment" />
                <option value="Event Management" />

                {/* Retail & E-commerce */}
                <option value="Retail" />
                <option value="E-commerce" />
                <option value="Wholesale" />

                {/* Hospitality & Food */}
                <option value="Hospitality" />
                <option value="Restaurants & Catering" />
                <option value="Hotels & Accommodation" />
                <option value="Food & Beverage" />

                {/* Education */}
                <option value="Education" />
                <option value="Training & Development" />
                <option value="Tutoring Services" />

                {/* Real Estate & Property */}
                <option value="Real Estate" />
                <option value="Property Management" />
                <option value="Estate Agency" />

                {/* Transportation & Logistics */}
                <option value="Transportation" />
                <option value="Logistics & Distribution" />
                <option value="Courier Services" />

                {/* Creative & Design */}
                <option value="Graphic Design" />
                <option value="Web Design" />
                <option value="Photography" />
                <option value="Video Production" />
                <option value="Creative Services" />

                {/* Automotive */}
                <option value="Automotive Repair" />
                <option value="Vehicle Services" />

                {/* Home Services */}
                <option value="Cleaning Services" />
                <option value="Landscaping & Gardening" />
                <option value="Pest Control" />
                <option value="Security Services" />

                {/* Manufacturing */}
                <option value="Manufacturing" />
                <option value="Engineering" />

                {/* Other */}
                <option value="Other Services" />
              </datalist>
            </div>

            {/* Optional Section */}
            <div className="space-y-6 pt-4">
              <h3 className="text-base font-semibold text-muted-foreground">{t('onboardingFlow.optionalInformation')}</h3>

              <div className="space-y-2">
                <Label htmlFor="description">{t('onboardingFlow.companyDescription')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('onboardingFlow.companyDescriptionPlaceholder')}
                  value={companyData.description}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">{t('onboardingFlow.registrationNumber')}</Label>
                <Input
                  id="registrationNumber"
                  placeholder={t('onboardingFlow.registrationNumberPlaceholder')}
                  value={companyData.registrationNumber}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t('onboardingFlow.registrationNumberDesc')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t('onboardingFlow.phoneNumber')}</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder={t('onboardingFlow.phoneNumberPlaceholder')}
                  value={companyData.phoneNumber}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t('onboardingFlow.phoneNumberDesc')}
                </p>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <Label>{t('onboardingFlow.servicesOffered')}</Label>
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={t('onboardingFlow.servicesPlaceholder')}
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          if (newService.trim() && !companyData.services.includes(newService.trim())) {
                            setCompanyData((prev) => ({ ...prev, services: [...prev.services, newService.trim()] }))
                            setNewService("")
                            setShowServiceSuggestions(false)
                          }
                        }
                      }}
                      onFocus={() => newService.trim().length > 0 && setShowServiceSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 200)}
                      className="border-2"
                    />
                    {/* Service suggestions dropdown */}
                    {showServiceSuggestions && filteredServiceSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 max-h-60 overflow-y-auto bg-white border-2 border-blue-500 rounded-lg shadow-lg z-50">
                        {filteredServiceSuggestions.map((service) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => {
                              if (!companyData.services.includes(service)) {
                                setCompanyData((prev) => ({ ...prev, services: [...prev.services, service] }))
                                setNewService("")
                                setShowServiceSuggestions(false)
                              }
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm"
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newService.trim() && !companyData.services.includes(newService.trim())) {
                        setCompanyData((prev) => ({ ...prev, services: [...prev.services, newService.trim()] }))
                        setNewService("")
                        setShowServiceSuggestions(false)
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {companyData.services.map((service) => (
                    <Badge key={service} variant="secondary" className="flex items-center gap-1">
                      {service}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setCompanyData((prev) => ({ ...prev, services: prev.services.filter((s) => s !== service) }))}
                      />
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('onboardingFlow.servicesDesc')}
                </p>
              </div>

              {/* Spoken Languages */}
              <div className="space-y-2">
                <Label>{t('onboardingFlow.spokenLanguages')}</Label>
                <LanguageSelector
                  selectedLanguages={companyData.spokenLanguages}
                  onChange={(languages) => setCompanyData((prev) => ({ ...prev, spokenLanguages: languages }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t('onboardingFlow.spokenLanguagesDesc')}
                </p>
              </div>

              {/* Price List */}
              <div className="space-y-2">
                <Label htmlFor="priceList">{t('onboardingFlow.priceList')}</Label>
                <Textarea
                  id="priceList"
                  placeholder={t('onboardingFlow.priceListPlaceholder')}
                  value={companyData.priceList}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, priceList: e.target.value }))}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {t('onboardingFlow.priceListDesc')}
                </p>
              </div>

              {/* 24/7 Service */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="service24_7"
                  checked={companyData.service24_7}
                  onChange={(e) => setCompanyData((prev) => ({ ...prev, service24_7: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="service24_7" className="text-sm font-normal cursor-pointer">
                  {t('onboardingFlow.available247')}
                </Label>
              </div>
            </div>

            {/* Optional UK Address Fields */}
            <div className="space-y-4 border-t pt-6">
              <Label className="text-base font-semibold text-muted-foreground">{t('onboardingFlow.companyAddress')}</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">{t('onboardingFlow.addressLine1')}</Label>
                  <Input
                    id="addressLine1"
                    placeholder={t('onboardingFlow.addressLine1Placeholder')}
                    value={companyData.addressLine1 || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">{t('onboardingFlow.addressLine2')}</Label>
                  <Input
                    id="addressLine2"
                    placeholder={t('onboardingFlow.addressLine2Placeholder')}
                    value={companyData.addressLine2 || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t('onboardingFlow.city')}</Label>
                  <Input
                    id="city"
                    placeholder={t('onboardingFlow.cityPlaceholder')}
                    value={companyData.city || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">{t('onboardingFlow.county')}</Label>
                  <Input
                    id="county"
                    placeholder={t('onboardingFlow.countyPlaceholder')}
                    value={companyData.county || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, county: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postcode">{t('onboardingFlow.postcode')}</Label>
                  <Input
                    id="postcode"
                    placeholder={t('onboardingFlow.postcodePlaceholder')}
                    value={companyData.postcode || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, postcode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t('onboardingFlow.country')}</Label>
                  <Input
                    id="country"
                    placeholder={t('onboardingFlow.countryPlaceholder')}
                    value={companyData.country || ""}
                    onChange={(e) => setCompanyData((prev) => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">{t('onboardingFlow.websiteUrl')}</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder={t('onboardingFlow.companyWebsitePlaceholder')}
                value={companyData.websiteUrl}
                onChange={(e) => setCompanyData((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    setCompanyData((prev) => ({ ...prev, websiteUrl: `https://${value}` }))
                  }
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={loading || !companyData.companyName || !companyData.industry || (!companyData.latitude || !companyData.longitude)}
              >
                {loading ? t('onboardingFlow.creatingProfile') : t('onboardingFlow.completeSetup')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Homeowner Profile */}
      {step === 2 && userType === "homeowner" && (
        <Card>
          <CardHeader>
            <CardTitle>{t('onboardingFlow.homeownerProfile')}</CardTitle>
            <CardDescription>{t('onboardingFlow.homeownerProfileDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <HomeownerOnboardingForm userId={user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
