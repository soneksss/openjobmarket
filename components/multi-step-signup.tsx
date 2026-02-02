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
import { User, Building2, ArrowRight, ArrowLeft, Loader2, Check, X, Plus } from "lucide-react"
import Link from "next/link"
import { MapLocationPicker } from "@/components/map-location-picker"
import { useTranslation } from "@/lib/i18n/context"

interface SignupData {
  accountType: "individual" | "company" | null
  email: string
  password: string
  confirmPassword: string
  // Individual fields
  firstName: string
  lastName: string
  nickname: string
  title: string
  // Company fields
  companyName: string
  industry: string
  services: string[]
  // Common fields
  phone: string
  location: string
  latitude: number | null
  longitude: number | null
  // Legal requirements
  ageConfirmation: boolean
}

export default function MultiStepSignup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useTranslation()

  // Locale-aware dashboard URL
  const isOnBrRoute = locale === 'pt-BR'
  const dashboardUrl = '/dashboard'

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceInput, setServiceInput] = useState('')

  const [signupData, setSignupData] = useState<SignupData>({
    accountType: null,
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    nickname: "",
    title: "",
    companyName: "",
    industry: "",
    services: [],
    phone: "",
    location: "",
    latitude: null,
    longitude: null,
    ageConfirmation: false,
  })

  const updateSignupData = (updates: Partial<SignupData>) => {
    setSignupData(prev => ({ ...prev, ...updates }))
  }

  // Read URL parameters from Quick Check modal and pre-populate form
  useEffect(() => {
    const accountTypeParam = searchParams?.get('accountType')
    const sourceParam = searchParams?.get('source')

    if (sourceParam === 'quickcheck' && accountTypeParam) {
      console.log('[SIGNUP] Pre-populating from Quick Check:', { accountTypeParam })
      const accountType = accountTypeParam as 'individual' | 'company'
      setSignupData(prev => ({ ...prev, accountType }))
      // Skip to step 2 (profile info) since account type is already selected
      setCurrentStep(2)
    }
  }, [searchParams])

  const canProceedFromStep1 = signupData.accountType !== null

  const validateStep2 = async () => {
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

    // Check age confirmation for individual accounts
    if (signupData.accountType === "individual" && !signupData.ageConfirmation) {
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

    // Professional title is required for individuals
    if (signupData.accountType === "individual" && !signupData.title) {
      setError(t('signup.enterProfessionalTitle') || 'Please enter your professional title')
      return false
    }

    // Location is required for all user types
    if (!signupData.latitude || !signupData.longitude) {
      setError(t('signup.selectLocationRequired'))
      return false
    }

    return true
  }

  const handleSignup = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Determine user_type based on account type
      // Individual → professional, Business → company
      const userType = signupData.accountType === "individual" ? "professional" : "company"

      // Map accountType to database values: 'individual' stays as is, 'company' becomes 'business'
      const dbAccountType = signupData.accountType === 'company' ? 'business' : 'individual'

      // Auto-set roles based on account type
      // Individual: jobseeker + homeowner capabilities (can look for jobs AND hire tradespeople)
      // Business: employer + tradespeople capabilities (can hire AND offer services)
      const isIndividual = signupData.accountType === "individual"

      const metadata: Record<string, any> = {
        user_type: userType,
        account_type: dbAccountType,
        // Individual accounts are jobseekers who can also hire (homeowner capabilities built-in)
        is_jobseeker: isIndividual,
        is_homeowner: isIndividual, // Individuals can hire tradespeople
        // Business accounts can both hire and offer services
        is_employer: !isIndividual,
        is_tradespeople: !isIndividual,
      }

      // Add optional fields only if they exist
      if (signupData.firstName) metadata.first_name = signupData.firstName
      if (signupData.lastName) metadata.last_name = signupData.lastName
      if (signupData.nickname) metadata.nickname = signupData.nickname
      if (signupData.companyName) metadata.company_name = signupData.companyName
      if (signupData.title) metadata.title = signupData.title
      if (signupData.industry) metadata.industry = signupData.industry
      if (signupData.services && signupData.services.length > 0) {
        metadata.trade = signupData.services[0]
        metadata.services = signupData.services.filter(s => s)
      }
      if (signupData.phone) {
        metadata.phone = signupData.phone
        metadata.phone_number = signupData.phone
      }
      if (signupData.location) metadata.location = signupData.location
      if (signupData.latitude !== undefined) metadata.latitude = signupData.latitude
      if (signupData.longitude !== undefined) metadata.longitude = signupData.longitude

      console.log("[SIGNUP] Metadata prepared:", { email: signupData.email, metadata })

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email.trim().toLowerCase(),
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: metadata,
        },
      })

      console.log("[SIGNUP] Response:", { user: authData?.user?.id, error: signUpError })

      if (signUpError) {
        console.error("[SIGNUP] Signup error:", signUpError)
        throw signUpError
      }
      if (!authData.user) throw new Error("Failed to create user")

      // Save email to localStorage for resend functionality
      localStorage.setItem('signup_email', signupData.email)

      // Redirect to email verification page
      if (!authData.user.email_confirmed_at) {
        const verifyEmailUrl = isOnBrRoute
          ? `/auth/verify-email?locale=pt-BR&email=${encodeURIComponent(signupData.email)}`
          : `/auth/verify-email?email=${encodeURIComponent(signupData.email)}`
        router.push(verifyEmailUrl)
      } else {
        router.push(dashboardUrl)
      }
    } catch (err: any) {
      console.error("[SIGNUP] ❌ Signup error:", err)

      let errorMessage = ""
      if (err.message?.includes('already registered') || err.message?.includes('already exists') || err.message?.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please use a different email or sign in.'
      } else if (err.message?.includes('Password')) {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (err.message?.includes('Email')) {
        errorMessage = 'Please enter a valid email address.'
      } else if (err.message?.includes('Database error')) {
        errorMessage = 'There was a problem creating your account. Please try again.'
      } else if (err.message) {
        errorMessage = `Signup failed: ${err.message}`
      } else {
        errorMessage = "An error occurred during signup. Please try again."
      }

      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const nextStep = async () => {
    setError(null)
    if (currentStep === 1 && canProceedFromStep1) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setIsLoading(true)
      const isValid = await validateStep2()
      setIsLoading(false)
      if (isValid) {
        await handleSignup()
      }
    }
  }

  const prevStep = () => {
    setError(null)
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">{t('signup.title')}</CardTitle>
        <CardDescription>
          {t('signup.step')} {currentStep} {t('signup.of')} 2
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
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Find jobs ✓ Hire tradespeople
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
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Post jobs ✓ Offer services ✓ Hire staff
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

        {/* Step 2: Profile Setup */}
        {currentStep === 2 && (
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

                  {/* Professional Title - Required */}
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

                  {/* Industry - Optional */}
                  <div>
                    <Label htmlFor="industry" className="font-semibold block mb-2">
                      {t('signup.industryLabel') || 'Industry'} <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
                    </Label>
                    <Input
                      id="industry"
                      list="industry-options"
                      value={signupData.industry}
                      onChange={(e) => updateSignupData({ industry: e.target.value })}
                      placeholder={t('signup.industryPlaceholder') || 'e.g. Technology, Healthcare, Construction'}
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
                      <option value="Trades & Home Services" />
                    </datalist>
                  </div>

                  {/* Services - Optional */}
                  <div>
                    <Label htmlFor="trade" className="font-semibold block mb-2">
                      {t('signup.tradeLabel') || 'Services Offered'} <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
                    </Label>
                    <div className="space-y-2">
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
                                    updateSignupData({ services: newServices })
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
                          placeholder={t('signup.tradePlaceholder') || 'e.g. Plumbing, Electrical, IT Support'}
                          className="bg-white border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors shadow-sm"
                        />
                        <datalist id="trade-options">
                          <option value="Plumbing" />
                          <option value="Electrical Work" />
                          <option value="Carpentry" />
                          <option value="Painting & Decorating" />
                          <option value="Roofing" />
                          <option value="HVAC (Heating & Cooling)" />
                          <option value="Landscaping & Gardening" />
                          <option value="Cleaning Services" />
                          <option value="IT Support" />
                          <option value="Web Development" />
                          <option value="Consulting" />
                          <option value="Accounting" />
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
                        Add services you offer. Helps customers find you.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="email" className="font-semibold block mb-2">{t('signup.emailLabel')} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="password" className="font-semibold block mb-2">{t('signup.passwordLabel')} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="confirmPassword" className="font-semibold block mb-2">{t('signup.confirmPasswordLabel')} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="phone" className="font-semibold block mb-2">{t('signup.phoneLabel')} <span className="text-xs text-muted-foreground">({t('common.optional')})</span></Label>
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

              {/* Age Confirmation - Required for individual accounts */}
              {signupData.accountType === "individual" && (
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
