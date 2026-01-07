"use client"

import { useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
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

    // Check if email already exists
    try {
      const supabase = createClient()
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', signupData.email.toLowerCase())
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking email:', checkError)
        setError('Unable to verify email. Please try again.')
        return false
      }

      if (existingUser) {
        setError('This email is already registered. Please use a different email or sign in.')
        return false
      }
    } catch (err) {
      console.error('Error validating email:', err)
      setError('Unable to verify email. Please try again.')
      return false
    }

    return true
  }

  const handleSignup = async () => {
    // Validate Step 5 data
    setError(null)

    if (signupData.accountType === "individual" && !signupData.title) {
      setError("Professional title is required")
      return
    }

    if (signupData.accountType === "company" && !signupData.industry) {
      setError("Industry is required")
      return
    }

    if (signupData.accountType === "company" && (!signupData.latitude || !signupData.longitude)) {
      setError("Company location is required")
      return
    }

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

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            account_type: signupData.accountType,
            user_type: userType,
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            company_name: signupData.companyName,
          },
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error("Failed to create user")

      // Create user record using database function (bypasses RLS)
      // This is needed because session may not be available if email confirmation is required
      const { error: userError } = await supabase.rpc('create_user_on_signup', {
        p_user_id: authData.user.id,
        p_email: signupData.email,
        p_user_type: userType,
        p_account_type: signupData.accountType,
        p_is_jobseeker: signupData.roles.jobseeker,
        p_is_homeowner: signupData.roles.homeowner,
        p_is_employer: signupData.roles.employer,
        p_is_tradespeople: signupData.roles.tradespeople,
        p_phone: signupData.phone || null,
        p_nickname: signupData.nickname || null,
        p_location: signupData.location || null,
        p_latitude: signupData.latitude,
        p_longitude: signupData.longitude
      })

      if (userError) {
        console.error("[SIGNUP] Error creating user record:", userError)
        throw userError
      }

      // Create profile based on user type
      if (userType === "professional") {
        const { error: profileError } = await supabase.from("professional_profiles").insert({
          user_id: authData.user.id,
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          nickname: signupData.nickname || null,
          title: signupData.title,
          bio: signupData.bio || null,
          experience_level: signupData.experienceLevel,
          skills: signupData.skills.length > 0 ? signupData.skills : null,
          location: signupData.location || null,
          latitude: signupData.latitude,
          longitude: signupData.longitude,
        })

        if (profileError) throw profileError
      } else if (userType === "company") {
        const { error: profileError } = await supabase.from("company_profiles").insert({
          user_id: authData.user.id,
          company_name: signupData.companyName,
          industry: signupData.industry,
          bio: signupData.companyBio || null,
          services: signupData.services.length > 0 ? signupData.services : null,
          location: signupData.location,
          latitude: signupData.latitude,
          longitude: signupData.longitude,
        })

        if (profileError) throw profileError
      } else if (userType === "homeowner") {
        const { error: profileError } = await supabase.from("homeowner_profiles").insert({
          user_id: authData.user.id,
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          nickname: signupData.nickname || null,
        })

        if (profileError) throw profileError
      }

      // Check if email confirmation is required
      // If email_confirmed_at is null, user needs to confirm their email
      if (!authData.user.email_confirmed_at) {
        // Redirect to sign-up success page with locale
        const signUpSuccessUrl = isOnBrRoute
          ? "/auth/sign-up-success?locale=pt-BR"
          : "/auth/sign-up-success"
        router.push(signUpSuccessUrl)
      } else {
        // Email auto-confirmed, redirect directly to dashboard (locale-aware)
        const dashboardUrl = userType === "professional"
          ? getLocalePath("/dashboard/professional")
          : userType === "company"
          ? getLocalePath("/dashboard/company")
          : getLocalePath("/dashboard/homeowner")

        router.push(dashboardUrl)
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || "An error occurred during signup")
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
        setCurrentStep(4) // Profile setup
      } else {
        setError(t('signup.selectAtLeastOneRole'))
      }
    } else if (currentStep === 4) {
      // Validate Step 4 before proceeding to Step 5
      setIsLoading(true)
      const isValid = await validateStep3()
      setIsLoading(false)
      if (isValid) {
        setCurrentStep(5) // Detailed profile information
      }
    }
  }

  const prevStep = () => {
    setError(null)
    if (currentStep === 5) {
      // Go back to profile setup
      setCurrentStep(4)
    } else if (currentStep === 4) {
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
          {t('signup.step')} {currentStep === 1 ? "1" : currentStep === 2 || currentStep === 3 ? "2" : currentStep === 4 ? "3" : "4"} {t('signup.of')} 4
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
                {t('common.continue')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Detailed Profile Information */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">{t('signup.profileDetails')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {signupData.accountType === "individual"
                  ? t('signup.completeYourProfile')
                  : t('signup.tellUsAboutCompany')}
              </p>
            </div>

            <div className="space-y-4">
              {signupData.accountType === "individual" ? (
                <>
                  {/* Professional Title with Suggestions */}
                  <div>
                    <Label htmlFor="title" className="font-semibold">{t('signup.professionalTitle')} <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      value={signupData.title}
                      onChange={(e) => updateSignupData({ title: e.target.value })}
                      placeholder={t('signup.titlePlaceholder')}
                      required
                      className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                      list="titleSuggestions"
                    />
                    <datalist id="titleSuggestions">
                      {getJobTitles(locale).map((title) => (
                        <option key={title} value={title} />
                      ))}
                    </datalist>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio" className="font-semibold">{t('signup.bio')}</Label>
                    <textarea
                      id="bio"
                      value={signupData.bio}
                      onChange={(e) => updateSignupData({ bio: e.target.value })}
                      placeholder={t('signup.bioPlaceholder')}
                      className="w-full min-h-[100px] px-3 py-2 bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm rounded-md"
                    />
                  </div>

                  {/* Experience Level */}
                  <div>
                    <Label htmlFor="experienceLevel" className="font-semibold">{t('signup.experienceLevel')}</Label>
                    <select
                      id="experienceLevel"
                      value={signupData.experienceLevel}
                      onChange={(e) => updateSignupData({ experienceLevel: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm rounded-md text-sm"
                    >
                      <option value="entry">{t('signup.entry')}</option>
                      <option value="mid">{t('signup.mid')}</option>
                      <option value="senior">{t('signup.senior')}</option>
                      <option value="lead">{t('signup.lead')}</option>
                      <option value="executive">{t('signup.executive')}</option>
                    </select>
                  </div>

                  {/* Skills with Suggestions */}
                  <div>
                    <Label htmlFor="skillInput" className="font-semibold">{t('signup.skills')}</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        ref={skillInputRef}
                        id="skillInput"
                        placeholder={t('signup.skillsPlaceholder')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const input = e.currentTarget
                            const skill = input.value.trim()
                            if (skill && !signupData.skills.includes(skill)) {
                              updateSignupData({ skills: [...signupData.skills, skill] })
                              input.value = ''
                            }
                          }
                        }}
                        className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                        list="skillSuggestions"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (skillInputRef.current) {
                            const skill = skillInputRef.current.value.trim()
                            if (skill && !signupData.skills.includes(skill)) {
                              updateSignupData({ skills: [...signupData.skills, skill] })
                              skillInputRef.current.value = ''
                              skillInputRef.current.focus()
                            }
                          }
                        }}
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <datalist id="skillSuggestions">
                      {getSkills(locale).map((skill) => (
                        <option key={skill} value={skill} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-sm text-muted-foreground">{locale === 'pt-BR' ? 'Adicionar rápido:' : 'Quick add:'}</span>
                      {getSkills(locale).filter(s => !signupData.skills.includes(s)).slice(0, 10).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="cursor-pointer text-xs"
                          onClick={() => updateSignupData({ skills: [...signupData.skills, skill] })}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {signupData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {signupData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => {
                                updateSignupData({
                                  skills: signupData.skills.filter((_, i) => i !== index)
                                })
                              }}
                              className="hover:bg-blue-200 rounded-full"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Salary Range */}
                  <div className="space-y-3">
                    <Label>{t('signup.salaryRange')} (Optional)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="salaryMin" className="text-xs text-muted-foreground">{t('signup.minimum')}</Label>
                        <Input
                          id="salaryMin"
                          type="number"
                          value={signupData.salaryMin}
                          onChange={(e) => updateSignupData({ salaryMin: e.target.value })}
                          placeholder="0"
                          className="border-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="salaryMax" className="text-xs text-muted-foreground">{t('signup.maximum')}</Label>
                        <Input
                          id="salaryMax"
                          type="number"
                          value={signupData.salaryMax}
                          onChange={(e) => updateSignupData({ salaryMax: e.target.value })}
                          placeholder="0"
                          className="border-2"
                        />
                      </div>
                    </div>
                    <select
                      value={signupData.salaryFrequency}
                      onChange={(e) => updateSignupData({ salaryFrequency: e.target.value as any })}
                      className="w-full px-3 py-2 border-2 rounded-md text-sm"
                    >
                      <option value="per_month">{t('signup.perMonth')}</option>
                      <option value="per_year">{t('signup.perYear')}</option>
                      <option value="per_hour">{t('signup.perHour')}</option>
                    </select>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">{t('signup.additionalInfo')}</Label>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="drivingLicense"
                        checked={signupData.drivingLicense}
                        onCheckedChange={(checked) => updateSignupData({ drivingLicense: !!checked })}
                      />
                      <Label htmlFor="drivingLicense" className="text-sm font-normal cursor-pointer">
                        {t('signup.hasDrivingLicence')}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ownTransport"
                        checked={signupData.ownTransport}
                        onCheckedChange={(checked) => updateSignupData({ ownTransport: !!checked })}
                      />
                      <Label htmlFor="ownTransport" className="text-sm font-normal cursor-pointer">
                        {t('signup.hasOwnTransport')}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="willingToRelocate"
                        checked={signupData.willingToRelocate}
                        onCheckedChange={(checked) => updateSignupData({ willingToRelocate: !!checked })}
                      />
                      <Label htmlFor="willingToRelocate" className="text-sm font-normal cursor-pointer">
                        {t('signup.readyToRelocate')}
                      </Label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Industry */}
                  <div>
                    <Label htmlFor="industry">{t('signup.industry')} <span className="text-red-500">*</span></Label>
                    <Input
                      id="industry"
                      value={signupData.industry}
                      onChange={(e) => updateSignupData({ industry: e.target.value })}
                      placeholder={t('signup.industryPlaceholder')}
                      required
                      className="border-2"
                    />
                  </div>

                  {/* Company Bio */}
                  <div>
                    <Label htmlFor="companyBio">{t('signup.companyBio')}</Label>
                    <textarea
                      id="companyBio"
                      value={signupData.companyBio}
                      onChange={(e) => updateSignupData({ companyBio: e.target.value })}
                      placeholder={t('signup.companyBioPlaceholder')}
                      className="w-full min-h-[100px] px-3 py-2 border-2 rounded-md"
                    />
                  </div>

                  {/* Services */}
                  <div>
                    <Label htmlFor="serviceInput">{t('signup.services')}</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        id="serviceInput"
                        placeholder={t('signup.servicesPlaceholder')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const input = e.currentTarget
                            const service = input.value.trim()
                            if (service && !signupData.services.includes(service)) {
                              updateSignupData({ services: [...signupData.services, service] })
                              input.value = ''
                            }
                          }
                        }}
                        className="border-2"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {signupData.services.map((service, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {service}
                          <button
                            type="button"
                            onClick={() => {
                              updateSignupData({
                                services: signupData.services.filter((_, i) => i !== index)
                              })
                            }}
                            className="hover:bg-blue-200 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Company Location on Map */}
                  <div>
                    <Label>{t('signup.companyLocation')} <span className="text-red-500">*</span></Label>
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
                      placeholder={t('signup.selectCompanyLocation')}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={prevStep} disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={handleSignup} disabled={isLoading} className="min-w-32">
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
