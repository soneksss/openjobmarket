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

  // Locale-aware onboarding URL
  const isOnBrRoute = locale === 'pt-BR'
  const onboardingUrl = isOnBrRoute
    ? '/onboarding?locale=pt-BR&returnUrl=/br'
    : '/onboarding'

  // Helper to create locale-aware paths
  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    // Location is required for Jobseekers and Tradespeople
    const requiresLocation = signupData.roles.jobseeker || signupData.roles.tradespeople
    if (requiresLocation && (!signupData.latitude || !signupData.longitude)) {
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
      // Detailed profile will be completed in onboarding
      // Database trigger automatically creates user and profile records
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

            // Contact and location (only if provided in Step 3)
            phone: signupData.phone || null,
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
      // If email_confirmed_at is null, user needs to confirm their email
      if (!authData.user.email_confirmed_at) {
        // Redirect to sign-up success page with locale
        const signUpSuccessUrl = isOnBrRoute
          ? "/auth/sign-up-success?locale=pt-BR"
          : "/auth/sign-up-success"
        router.push(signUpSuccessUrl)
      } else {
        // Email auto-confirmed, redirect to onboarding to complete profile
        router.push(onboardingUrl)
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
                      <Label htmlFor="firstName" className="font-semibold">{t('signup.firstNameLabel')}</Label>
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
                      <Label htmlFor="lastName" className="font-semibold">{t('signup.lastNameLabel')}</Label>
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

                  {/* Nickname field - Optional */}
                  <div>
                    <Label htmlFor="nickname" className="font-semibold">
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
                <div>
                  <Label htmlFor="companyName" className="font-semibold">{t('signup.companyNameLabel')}</Label>
                  <Input
                    id="companyName"
                    value={signupData.companyName}
                    onChange={(e) => updateSignupData({ companyName: e.target.value })}
                    placeholder={t('signup.companyNamePlaceholder')}
                    required
                    className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="font-semibold">{t('signup.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => updateSignupData({ email: e.target.value })}
                  placeholder={t('signup.emailPlaceholderProfile')}
                  required
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              <div>
                <Label htmlFor="password" className="font-semibold">{t('signup.passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => updateSignupData({ password: e.target.value })}
                  placeholder={t('signup.passwordPlaceholder')}
                  required
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="font-semibold">{t('signup.confirmPasswordLabel')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => updateSignupData({ confirmPassword: e.target.value })}
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  required
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="font-semibold">{t('signup.phoneLabel')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => updateSignupData({ phone: e.target.value })}
                  placeholder={t('signup.phonePlaceholder')}
                  className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                />
              </div>

              {/* Location picker - Required for Jobseekers and Tradespeople, Optional for Homeowners and Employers */}
              <div>
                {(signupData.roles.jobseeker || signupData.roles.tradespeople) ? (
                  <div className="space-y-2">
                    <Label className="font-semibold">
                      {t('signup.yourLocation')}
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
                ) : (signupData.roles.homeowner || signupData.roles.employer) ? (
                  <div className="space-y-2">
                    <Label className="font-semibold">
                      {t('signup.locationOptional')}
                      <span className="text-xs text-muted-foreground ml-2">
                        {t('signup.locationHint')}
                      </span>
                    </Label>
                    <Input
                      id="location"
                      value={signupData.location}
                      onChange={(e) => updateSignupData({ location: e.target.value })}
                      placeholder={t('signup.locationPlaceholderOptional')}
                      className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                    />
                  </div>
                ) : null}
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
