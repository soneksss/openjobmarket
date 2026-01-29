"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User, Building2, Briefcase, Home, Wrench, Users, ArrowRight, ArrowLeft, Loader2, Check, X, Plus } from "lucide-react"
import Link from "next/link"
import { MapLocationPicker } from "@/components/map-location-picker"
import { useTranslation } from "@/lib/i18n/context"

// Common job titles for autocomplete suggestions (locale-aware)
const getJobTitles = (locale: string) => {
  if (locale === 'pt-BR') {
    return [
      "Engenheiro de Software", "Desenvolvedor Web", "Analista de Dados", "Gerente de Projetos",
      "Gerente de Marketing", "Representante de Vendas", "Contador", "Gerente de RH",
      "Encanador", "Eletricista", "Carpinteiro", "Construtor", "Pintor",
      "Faxineiro", "Motorista", "Auxiliar de Armazém", "Segurança",
      "Enfermeiro", "Cuidador", "Professor", "Chef", "Mecânico"
    ]
  }
  return [
    "Software Engineer", "Web Developer", "Data Analyst", "Project Manager",
    "Marketing Manager", "Sales Representative", "Accountant", "HR Manager",
    "Plumber", "Electrician", "Carpenter", "Builder", "Painter",
    "Cleaner", "Driver", "Warehouse Worker", "Security Guard",
    "Nurse", "Care Worker", "Teacher", "Chef", "Mechanic"
  ]
}

// Common skills for autocomplete suggestions (locale-aware)
const getSkills = (locale: string) => {
  if (locale === 'pt-BR') {
    return [
      "Comunicação", "Liderança", "Resolução de Problemas", "Trabalho em Equipe",
      "Gestão de Projetos", "Agile", "Gestão de Tempo", "Atendimento ao Cliente",
      "JavaScript", "Python", "React", "Node.js", "SQL", "AWS",
      "Excel", "Contabilidade", "Marketing", "Vendas", "Microsoft Office",
      "Encanamento", "Trabalho Elétrico", "Carpintaria", "Pintura", "Azulejista"
    ]
  }
  return [
    "Communication", "Leadership", "Problem Solving", "Teamwork",
    "Project Management", "Agile", "Time Management", "Customer Service",
    "JavaScript", "Python", "React", "Node.js", "SQL", "AWS",
    "Excel", "Accounting", "Marketing", "Sales", "Microsoft Office",
    "Plumbing", "Electrical Work", "Carpentry", "Painting", "Tiling"
  ]
}

interface SignupData {
  accountType: "individual" | "company" | null
  roles: {
    jobseeker: boolean
    homeowner: boolean
    employer: boolean
    tradespeople: boolean
  }
  email: string
  password: string
  confirmPassword: string
  // Individual fields
  firstName: string
  lastName: string
  nickname: string
  // Company fields
  companyName: string
  phone: string
  location: string
  latitude: number | null
  longitude: number | null
  // Legal requirements
  ageConfirmation: boolean
  // Step 5: Detailed Profile Fields
  // Professional/Jobseeker fields
  title: string
  bio: string
  experienceLevel: "entry" | "mid" | "senior" | "lead" | "executive"
  skills: string[]
  salaryMin: string
  salaryMax: string
  salaryFrequency: "per_year" | "per_month" | "per_hour"
  drivingLicense: boolean
  ownTransport: boolean
  willingToRelocate: boolean
  // Company fields
  industry: string
  companyBio: string
  services: string[]
}

export default function MultiStepSignup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useTranslation()

  // Locale-aware dashboard URL
  const isOnBrRoute = locale === 'pt-BR'
  const dashboardUrl = '/dashboard'

  // Helper to create locale-aware paths
  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceInput, setServiceInput] = useState('')
  const skillInputRef = useRef<HTMLInputElement>(null)

  const [signupData, setSignupData] = useState<SignupData>({
    accountType: null,
    roles: {
      jobseeker: false,
      homeowner: false,
      employer: false,
      tradespeople: false,
    },
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    nickname: "",
    companyName: "",
    phone: "",
    location: "",
    latitude: null,
    longitude: null,
    ageConfirmation: false,
    // Step 5 fields
    title: "",
    bio: "",
    experienceLevel: "mid",
    skills: [],
    salaryMin: "",
    salaryMax: "",
    salaryFrequency: "per_month",
    drivingLicense: false,
    ownTransport: false,
    willingToRelocate: false,
    industry: "",
    companyBio: "",
    services: [],
  })

  const updateSignupData = (updates: Partial<SignupData>) => {
    setSignupData(prev => ({ ...prev, ...updates }))
  }

  const toggleRole = (role: keyof SignupData["roles"]) => {
    setSignupData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [role]: !prev.roles[role]
      }
    }))
  }

  // Read URL parameters from Quick Check modal and pre-populate form
  useEffect(() => {
    const accountTypeParam = searchParams?.get('accountType')
    const rolesParam = searchParams?.get('roles')
    const sourceParam = searchParams?.get('source')

    if (sourceParam === 'quickcheck' && accountTypeParam && rolesParam) {
      console.log('[SIGNUP] Pre-populating from Quick Check:', { accountTypeParam, rolesParam })

      // Set account type
      const accountType = accountTypeParam as 'individual' | 'company'

      // Parse roles
      const selectedRoles = rolesParam.split(',')
      const rolesObject = {
        jobseeker: selectedRoles.includes('jobseeker'),
        homeowner: selectedRoles.includes('homeowner'),
        employer: selectedRoles.includes('employer'),
        tradespeople: selectedRoles.includes('tradespeople'),
      }

      // Update signup data
      setSignupData(prev => ({
        ...prev,
        accountType,
        roles: rolesObject
      }))

      // Skip to step 4 (basic profile info) since account type and roles are already selected
      setCurrentStep(4)
    }
  }, [searchParams])

  const canProceedFromStep1 = signupData.accountType !== null
  const canProceedFromStep2 = () => {
    const { jobseeker, homeowner, employer, tradespeople } = signupData.roles
    return jobseeker || homeowner || employer || tradespeople
  }

  const validateStep3 = async () => {
    // Clear previous errors
    setError(null)

    // Check required fields
    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError(t('signup.fillAllFields'))
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signupData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Check password match
    if (signupData.password !== signupData.confirmPassword) {
      setError(t('signup.passwordsDoNotMatch'))
      return false
    }

    // Check password length
    if (signupData.password.length < 6) {
      setError(t('signup.passwordTooShort'))
      return false
    }

    // Check age confirmation for jobseekers and homeowners
    if ((signupData.roles.jobseeker || signupData.roles.homeowner) && !signupData.ageConfirmation) {
      setError(t('signup.mustConfirmAge'))
      return false
    }

    // Check name fields
    if (signupData.accountType === "individual" && (!signupData.firstName || !signupData.lastName)) {
      setError(t('signup.enterFullName'))
      return false
    }
    if (signupData.accountType === "company" && !signupData.companyName) {
      setError(t('signup.enterCompanyName'))
      return false
    }

    // Professional title is required for Jobseekers
    if (signupData.roles.jobseeker && !signupData.title) {
      setError(t('signup.enterProfessionalTitle') || 'Please enter your professional title')
      return false
    }

    // Industry is required for Employers
    if (signupData.roles.employer && !signupData.industry) {
      setError(t('signup.enterIndustry') || 'Please enter your industry')
      return false
    }

    // Trade is required for Tradespeople
    if (signupData.roles.tradespeople && (!signupData.services || signupData.services.length === 0 || !signupData.services[0])) {
      setError(t('signup.enterTrade') || 'Please enter your trade or service')
      return false
    }

    // Location is required for all user types
    if (!signupData.latitude || !signupData.longitude) {
      setError(t('signup.selectLocationRequired'))
      return false
    }

    // Note: Email uniqueness is checked by Supabase Auth during signUp()
    // No need for pre-check which causes CORS issues

    return true
  }

  const handleSignup = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Determine user_type based on account type and roles
      let userType: string
      if (signupData.accountType === "individual") {
        if (signupData.roles.jobseeker) {
          userType = "professional"
        } else if (signupData.roles.homeowner) {
          userType = "homeowner"
        } else {
          userType = "professional"
        }
      } else {
        userType = "company"
      }

      // Create auth user with basic metadata only
      // Profile will be created AFTER email verification
      // Database trigger creates minimal user record (no profile yet)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Enable OTP-based email verification
          shouldCreateUser: true,
          data: {
            // User type and account type
            user_type: userType,
            account_type: signupData.accountType,

            // Role flags
            is_jobseeker: signupData.roles.jobseeker,
            is_homeowner: signupData.roles.homeowner,
            is_employer: signupData.roles.employer,
            is_tradespeople: signupData.roles.tradespeople,

            // Basic personal info
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            nickname: signupData.nickname || null,
            company_name: signupData.companyName,

            // Professional fields
            title: signupData.title || null,
            industry: signupData.industry || null,
            trade: signupData.services[0] || null,
            services: signupData.services.filter(s => s), // Save all services as array

            // Contact and location
            phone: signupData.phone || null,
            phone_number: signupData.phone || null, // Also save as phone_number for company profiles
            location: signupData.location || null,
            latitude: signupData.latitude,
            longitude: signupData.longitude,
          },
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error("Failed to create user")

      // Save email to localStorage for resend functionality
      localStorage.setItem('signup_email', signupData.email)

      // Check if email confirmation is required
      // If email_confirmed_at is null, user needs to verify with OTP code
      if (!authData.user.email_confirmed_at) {
        // Redirect to email verification page with OTP input
        const verifyEmailUrl = isOnBrRoute
          ? `/auth/verify-email?locale=pt-BR&email=${encodeURIComponent(signupData.email)}`
          : `/auth/verify-email?email=${encodeURIComponent(signupData.email)}`
        router.push(verifyEmailUrl)
      } else {
        // Email auto-confirmed (rare case), redirect to dashboard
        router.push(dashboardUrl)
      }
    } catch (err: any) {
      console.error("Signup error:", err)

      // Handle specific error cases
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setError('This email is already registered. Please use a different email or sign in.')
      } else if (err.message?.includes('Database error')) {
        setError('There was a problem creating your account. Please try again.')
      } else {
        setError(err.message || "An error occurred during signup")
      }

      setIsLoading(false)
    }
  }

  const nextStep = async () => {
    setError(null)
    if (currentStep === 1 && canProceedFromStep1) {
      // Determine which step 2 to show
      if (signupData.accountType === "individual") {
        setCurrentStep(2) // Step 2A
      } else {
        setCurrentStep(3) // Step 2B (we'll use step 3 for company roles)
      }
    } else if (currentStep === 2 || currentStep === 3) {
      if (canProceedFromStep2()) {
        setCurrentStep(4) // Basic profile setup (final step)
      } else {
        setError(t('signup.selectAtLeastOneRole'))
      }
    } else if (currentStep === 4) {
      // Validate Step 4 and complete signup
      setIsLoading(true)
      const isValid = await validateStep3()
      setIsLoading(false)
      if (isValid) {
        // Call handleSignup directly instead of moving to Step 5
        await handleSignup()
      }
    }
  }

  const prevStep = () => {
    setError(null)
    if (currentStep === 4) {
      // Go back to appropriate role selection
      setCurrentStep(signupData.accountType === "individual" ? 2 : 3)
    } else if (currentStep === 2 || currentStep === 3) {
      setCurrentStep(1)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">{t('signup.title')}</CardTitle>
        <CardDescription>
          {t('signup.step')} {currentStep === 1 ? "1" : currentStep === 2 || currentStep === 3 ? "2" : "3"} {t('signup.of')} 3
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Step 1: Account Type */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('signup.whoAreYou')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('signup.chooseAccountType')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => updateSignupData({ accountType: "individual" })}
                className={`p-6 border-2 rounded-lg text-left transition-all hover:border-blue-500 hover:shadow-md ${
                  signupData.accountType === "individual"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <User className="h-12 w-12 mb-3 text-blue-600" />
                <h4 className="font-semibold text-lg mb-2">{t('signup.individual')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('signup.individualDesc')}
                </p>
                {signupData.accountType === "individual" && (
                  <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-1" />
                    {t('signup.selected')}
                  </div>
                )}
              </button>

              <button
                onClick={() => updateSignupData({ accountType: "company" })}
                className={`p-6 border-2 rounded-lg text-left transition-all hover:border-orange-500 hover:shadow-md ${
                  signupData.accountType === "company"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                <Building2 className="h-12 w-12 mb-3 text-orange-600" />
                <h4 className="font-semibold text-lg mb-2">{t('signup.company')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('signup.companyDesc')}
                </p>
                {signupData.accountType === "company" && (
                  <div className="mt-3 flex items-center text-orange-600 text-sm font-medium">
                    <Check className="h-4 w-4 mr-1" />
                    {t('signup.selected')}
                  </div>
                )}
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep1}
                className="min-w-32"
              >
                {t('common.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2A: Individual Roles */}
        {currentStep === 2 && signupData.accountType === "individual" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('signup.whatToDo')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('signup.selectOneOrBoth')}
              </p>
            </div>

            <div className="space-y-4">
              <div
                onClick={() => toggleRole("jobseeker")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-blue-500 cursor-pointer ${
                  signupData.roles.jobseeker
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.jobseeker}
                    onCheckedChange={() => toggleRole("jobseeker")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                      <h4 className="font-semibold">{t('signup.jobseeker')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('signup.jobseekerDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => toggleRole("homeowner")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-green-500 cursor-pointer ${
                  signupData.roles.homeowner
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.homeowner}
                    onCheckedChange={() => toggleRole("homeowner")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Home className="h-5 w-5 mr-2 text-green-600" />
                      <h4 className="font-semibold">{t('signup.homeowner')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('signup.homeownerDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep2()}
                className="min-w-32"
              >
                {t('common.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2B: Company Roles */}
        {currentStep === 3 && signupData.accountType === "company" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('signup.whatDescribesCompany')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('signup.selectOptions')}
              </p>
            </div>

            <div className="space-y-4">
              <div
                onClick={() => toggleRole("employer")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-purple-500 cursor-pointer ${
                  signupData.roles.employer
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.employer}
                    onCheckedChange={() => toggleRole("employer")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Users className="h-5 w-5 mr-2 text-purple-600" />
                      <h4 className="font-semibold">{t('signup.employer')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('signup.employerDesc')}
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => toggleRole("tradespeople")}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all hover:border-orange-500 cursor-pointer ${
                  signupData.roles.tradespeople
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={signupData.roles.tradespeople}
                    onCheckedChange={() => toggleRole("tradespeople")}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Wrench className="h-5 w-5 mr-2 text-orange-600" />
                      <h4 className="font-semibold">{t('signup.tradespeople')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('signup.tradespeopleDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep2()}
                className="min-w-32"
              >
                {t('common.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Profile Setup */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('signup.profileSetup')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('signup.completeProfile')}
              </p>
            </div>

            <div className="space-y-4">
              {signupData.accountType === "individual" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="font-semibold block mb-2">{t('signup.firstNameLabel')} <span className="text-red-500">*</span></Label>
                      <Input
                        id="firstName"
                        value={signupData.firstName}
                        onChange={(e) => updateSignupData({ firstName: e.target.value })}
                        placeholder={t('signup.firstNamePlaceholder')}
                        required
                        className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="font-semibold block mb-2">{t('signup.lastNameLabel')} <span className="text-red-500">*</span></Label>
                      <Input
                        id="lastName"
                        value={signupData.lastName}
                        onChange={(e) => updateSignupData({ lastName: e.target.value })}
                        placeholder={t('signup.lastNamePlaceholder')}
                        required
                        className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Professional Title - Required for Jobseekers */}
                  {signupData.roles.jobseeker && (
                    <div>
                      <Label htmlFor="title" className="font-semibold block mb-2">
                        {t('signup.professionalTitleLabel') || 'Professional Title'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={signupData.title}
                        onChange={(e) => updateSignupData({ title: e.target.value })}
                        placeholder={t('signup.professionalTitlePlaceholder') || 'e.g. Software Engineer, Plumber, Nurse'}
                        required
                        className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('signup.professionalTitleHint') || 'Your job title or profession'}
                      </p>
                    </div>
                  )}

                  {/* Nickname field - Optional */}
                  <div>
                    <Label htmlFor="nickname" className="font-semibold block mb-2">
                      {t('signup.nicknameLabel')} <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
                    </Label>
                    <Input
                      id="nickname"
                      value={signupData.nickname}
                      onChange={(e) => updateSignupData({ nickname: e.target.value })}
                      placeholder={t('signup.nicknamePlaceholder')}
                      className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('signup.nicknameHint')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="companyName" className="font-semibold block mb-2">{t('signup.companyNameLabel')} <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyName"
                      value={signupData.companyName}
                      onChange={(e) => updateSignupData({ companyName: e.target.value })}
                      placeholder={t('signup.companyNamePlaceholder')}
                      required
                      className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                    />
                  </div>

                  {/* Industry - Required for Employers */}
                  {signupData.roles.employer && (
                    <div>
                      <Label htmlFor="industry" className="font-semibold block mb-2">
                        {t('signup.industryLabel') || 'Industry'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="industry"
                        list="industry-options"
                        value={signupData.industry}
                        onChange={(e) => updateSignupData({ industry: e.target.value })}
                        placeholder={t('signup.industryPlaceholder') || 'e.g. Technology, Healthcare, Construction'}
                        required
                        className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                      />
                      <datalist id="industry-options">
                        <option value="Technology & IT" />
                        <option value="Healthcare & Medical" />
                        <option value="Construction & Engineering" />
                        <option value="Plumbing & Heating" />
                        <option value="Finance & Banking" />
                        <option value="Education & Training" />
                        <option value="Retail & Sales" />
                        <option value="Hospitality & Tourism" />
                        <option value="Manufacturing & Production" />
                        <option value="Real Estate & Property" />
                        <option value="Transportation & Logistics" />
                        <option value="Marketing & Advertising" />
                        <option value="Legal Services" />
                        <option value="Consulting & Business Services" />
                        <option value="Food & Beverage" />
                        <option value="Arts, Entertainment & Media" />
                        <option value="Telecommunications" />
                        <option value="Energy & Utilities" />
                        <option value="Agriculture & Farming" />
                        <option value="Automotive" />
                        <option value="Pharmaceutical & Biotechnology" />
                        <option value="Insurance" />
                        <option value="Professional Services" />
                        <option value="Government & Public Sector" />
                        <option value="Non-Profit & NGO" />
                        <option value="Human Resources" />
                        <option value="Customer Service & Support" />
                        <option value="Security & Safety" />
                        <option value="Environmental Services" />
                        <option value="Research & Development" />
                        <option value="Sports & Fitness" />
                      </datalist>
                    </div>
                  )}

                  {/* Trade - Required for Tradespeople */}
                  {signupData.roles.tradespeople && (
                    <div>
                      <Label htmlFor="trade" className="font-semibold block mb-2">
                        {t('signup.tradeLabel') || 'Trade/Service'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="space-y-2">
                        {/* Display current services as badges */}
                        {signupData.services && signupData.services.length > 0 && signupData.services[0] && (
                          <div className="flex flex-wrap gap-2">
                            {signupData.services.map((service, index) => (
                              service && (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200"
                                >
                                  {service}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newServices = signupData.services.filter((_, i) => i !== index)
                                      updateSignupData({ services: newServices.length > 0 ? newServices : [''] })
                                    }}
                                    className="ml-2 hover:text-blue-900"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              )
                            ))}
                          </div>
                        )}

                        {/* Input to add new service */}
                        <div className="flex gap-2">
                          <Input
                            id="trade"
                            list="trade-options"
                            value={serviceInput}
                            onChange={(e) => setServiceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const value = serviceInput.trim()
                                if (value) {
                                  const currentServices = signupData.services.filter(s => s)
                                  updateSignupData({ services: [...currentServices, value] })
                                  setServiceInput('')
                                }
                              }
                            }}
                            placeholder={t('signup.tradePlaceholder') || 'e.g. Plumbing, Electrical, Carpentry'}
                            className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                          />
                          <datalist id="trade-options">
                            <option value="Plumbing" />
                            <option value="Electrical Work" />
                            <option value="Carpentry" />
                            <option value="Painting & Decorating" />
                            <option value="Roofing" />
                            <option value="HVAC (Heating & Cooling)" />
                            <option value="Tiling" />
                            <option value="Flooring" />
                            <option value="Landscaping & Gardening" />
                            <option value="Masonry & Bricklaying" />
                            <option value="Plastering & Rendering" />
                            <option value="Kitchen Installation" />
                            <option value="Bathroom Installation" />
                            <option value="Window & Door Installation" />
                            <option value="Fencing & Gates" />
                            <option value="Driveway & Paving" />
                            <option value="Demolition" />
                            <option value="Insulation" />
                            <option value="Cleaning Services" />
                            <option value="Locksmith Services" />
                            <option value="Pest Control" />
                            <option value="Security Systems" />
                            <option value="Solar Panel Installation" />
                            <option value="Welding & Metalwork" />
                            <option value="Handyman Services" />
                          </datalist>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const value = serviceInput.trim()
                              if (value) {
                                const currentServices = signupData.services.filter(s => s)
                                updateSignupData({ services: [...currentServices, value] })
                                setServiceInput('')
                              }
                            }}
                            className="shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Add multiple services by typing and pressing Enter or clicking +
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <Label htmlFor="email" className="font-semibold block mb-2">{t('signup.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => updateSignupData({ email: e.target.value })}
                  placeholder={t('signup.emailPlaceholderProfile')}
                  autoComplete="email"
                  required
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              <div>
                <Label htmlFor="password" className="font-semibold block mb-2">{t('signup.passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => updateSignupData({ password: e.target.value })}
                  placeholder={t('signup.passwordPlaceholder')}
                  autoComplete="new-password"
                  required
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="font-semibold block mb-2">{t('signup.confirmPasswordLabel')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => updateSignupData({ confirmPassword: e.target.value })}
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  required
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="font-semibold block mb-2">{t('signup.phoneLabel')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => updateSignupData({ phone: e.target.value })}
                  placeholder={t('signup.phonePlaceholder')}
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              {/* Location picker - Required for all user types */}
              <div className="space-y-2">
                <Label className="font-semibold block mb-2">
                  {t('signup.yourLocation')} <span className="text-red-500">*</span>
                </Label>
                <MapLocationPicker
                  value={
                    signupData.latitude && signupData.longitude
                      ? {
                          latitude: signupData.latitude,
                          longitude: signupData.longitude,
                          address: signupData.location
                        }
                      : null
                  }
                  onChange={(location) => {
                    if (location) {
                      updateSignupData({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        location: location.address
                      })
                    } else {
                      updateSignupData({
                        latitude: null,
                        longitude: null,
                        location: ""
                      })
                    }
                  }}
                  height="350px"
                  placeholder={t('signup.mapPlaceholder')}
                />
              </div>

              {/* Age Confirmation - Required for Jobseekers and Homeowners */}
              {(signupData.roles.jobseeker || signupData.roles.homeowner) && (
                <div className="flex items-start space-x-3 rounded-lg border-2 border-gray-300 bg-white p-4 shadow-sm">
                  <Checkbox
                    id="ageConfirmation"
                    checked={signupData.ageConfirmation}
                    onCheckedChange={(checked) => updateSignupData({ ageConfirmation: checked as boolean })}
                    className="mt-1 border-2 border-gray-400"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="ageConfirmation"
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t('signup.ageConfirmation')} <span className="text-red-500">*</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={nextStep} disabled={isLoading} className="min-w-32">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('signup.creatingAccount')}
                  </>
                ) : (
                  t('signup.createAccountButton')
                )}
              </Button>
            </div>
          </div>
        )}


        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">{t('auth.alreadyHaveAccount')} </span>
          <Link href={isOnBrRoute ? `/auth/login?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}` : '/auth/login'} className="text-blue-600 hover:underline font-medium">
            {t('nav.signIn')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
