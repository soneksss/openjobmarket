"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { User, Building2, Briefcase, Home, Wrench, Users, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react"
import Link from "next/link"
import { MapLocationPicker } from "@/components/map-location-picker"
import { useTranslation } from "@/lib/i18n/context"

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
  // Company fields
  companyName: string
  phone: string
  location: string
  latitude: number | null
  longitude: number | null
  // Step 5: Detailed Profile Fields
  // Professional/Jobseeker fields
  title: string
  bio: string
  experienceLevel: "entry" | "mid" | "senior" | "lead" | "executive"
  skills: string[]
  hourlyRate: string
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
    companyName: "",
    phone: "",
    location: "",
    latitude: null,
    longitude: null,
    // Step 5 fields
    title: "",
    bio: "",
    experienceLevel: "mid",
    skills: [],
    hourlyRate: "",
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

  const validateStep3 = () => {
    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      setError(t('signup.fillAllFields'))
      return false
    }
    if (signupData.password !== signupData.confirmPassword) {
      setError(t('signup.passwordsDoNotMatch'))
      return false
    }
    if (signupData.password.length < 6) {
      setError(t('signup.passwordTooShort'))
      return false
    }
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

      // Create user record
      const { error: userError } = await supabase.from("users").upsert({
        id: authData.user.id,
        email: signupData.email,
        user_type: userType,
        account_type: signupData.accountType,
        is_jobseeker: signupData.roles.jobseeker,
        is_homeowner: signupData.roles.homeowner,
        is_employer: signupData.roles.employer,
        is_tradespeople: signupData.roles.tradespeople,
        phone: signupData.phone || null,
        location: signupData.location || null,
        latitude: signupData.latitude,
        longitude: signupData.longitude,
      }, {
        onConflict: 'id'
      })

      if (userError) throw userError

      // Create profile based on user type
      if (userType === "professional") {
        const { error: profileError } = await supabase.from("professional_profiles").insert({
          user_id: authData.user.id,
          first_name: signupData.firstName,
          last_name: signupData.lastName,
          title: signupData.title,
          bio: signupData.bio || null,
          experience_level: signupData.experienceLevel,
          skills: signupData.skills.length > 0 ? signupData.skills : null,
          hourly_rate: signupData.hourlyRate ? parseFloat(signupData.hourlyRate) : null,
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
        })

        if (profileError) throw profileError
      }

      // Redirect directly to dashboard (locale-aware)
      const dashboardUrl = userType === "professional"
        ? getLocalePath("/dashboard/professional")
        : userType === "company"
        ? getLocalePath("/dashboard/company")
        : getLocalePath("/dashboard/homeowner")

      router.push(dashboardUrl)
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || "An error occurred during signup")
      setIsLoading(false)
    }
  }

  const nextStep = () => {
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
      if (validateStep3()) {
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('signup.firstNameLabel')}</Label>
                    <Input
                      id="firstName"
                      value={signupData.firstName}
                      onChange={(e) => updateSignupData({ firstName: e.target.value })}
                      placeholder={t('signup.firstNamePlaceholder')}
                      required
                      className="border-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('signup.lastNameLabel')}</Label>
                    <Input
                      id="lastName"
                      value={signupData.lastName}
                      onChange={(e) => updateSignupData({ lastName: e.target.value })}
                      placeholder={t('signup.lastNamePlaceholder')}
                      required
                      className="border-2"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="companyName">{t('signup.companyNameLabel')}</Label>
                  <Input
                    id="companyName"
                    value={signupData.companyName}
                    onChange={(e) => updateSignupData({ companyName: e.target.value })}
                    placeholder={t('signup.companyNamePlaceholder')}
                    required
                    className="border-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">{t('signup.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => updateSignupData({ email: e.target.value })}
                  placeholder={t('signup.emailPlaceholderProfile')}
                  required
                  className="border-2"
                />
              </div>

              <div>
                <Label htmlFor="password">{t('signup.passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => updateSignupData({ password: e.target.value })}
                  placeholder={t('signup.passwordPlaceholder')}
                  required
                  className="border-2"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">{t('signup.confirmPasswordLabel')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => updateSignupData({ confirmPassword: e.target.value })}
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  required
                  className="border-2"
                />
              </div>

              <div>
                <Label htmlFor="phone">{t('signup.phoneLabel')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => updateSignupData({ phone: e.target.value })}
                  placeholder={t('signup.phonePlaceholder')}
                  className="border-2"
                />
              </div>

              {/* Location picker - Required for Jobseekers and Tradespeople, Optional for Homeowners and Employers */}
              <div>
                {(signupData.roles.jobseeker || signupData.roles.tradespeople) ? (
                  <div className="space-y-2">
                    <Label>
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
                    <Label>
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
                    />
                  </div>
                ) : null}
              </div>
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
                  {/* Professional Title */}
                  <div>
                    <Label htmlFor="title">{t('signup.professionalTitle')} <span className="text-red-500">*</span></Label>
                    <Input
                      id="title"
                      value={signupData.title}
                      onChange={(e) => updateSignupData({ title: e.target.value })}
                      placeholder={t('signup.titlePlaceholder')}
                      required
                      className="border-2"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio">{t('signup.bio')}</Label>
                    <textarea
                      id="bio"
                      value={signupData.bio}
                      onChange={(e) => updateSignupData({ bio: e.target.value })}
                      placeholder={t('signup.bioPlaceholder')}
                      className="w-full min-h-[100px] px-3 py-2 border-2 rounded-md"
                    />
                  </div>

                  {/* Experience Level */}
                  <div>
                    <Label htmlFor="experienceLevel">{t('signup.experienceLevel')}</Label>
                    <select
                      id="experienceLevel"
                      value={signupData.experienceLevel}
                      onChange={(e) => updateSignupData({ experienceLevel: e.target.value as any })}
                      className="w-full px-3 py-2 border-2 rounded-md"
                    >
                      <option value="entry">{t('signup.entry')}</option>
                      <option value="mid">{t('signup.mid')}</option>
                      <option value="senior">{t('signup.senior')}</option>
                      <option value="lead">{t('signup.lead')}</option>
                      <option value="executive">{t('signup.executive')}</option>
                    </select>
                  </div>

                  {/* Skills */}
                  <div>
                    <Label htmlFor="skillInput">{t('signup.skills')}</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
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
                        className="border-2"
                      />
                    </div>
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
                  </div>

                  {/* Hourly Rate (Optional) */}
                  <div>
                    <Label htmlFor="hourlyRate">{t('signup.hourlyRate')}</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={signupData.hourlyRate}
                      onChange={(e) => updateSignupData({ hourlyRate: e.target.value })}
                      placeholder={t('signup.hourlyRatePlaceholder')}
                      className="border-2"
                    />
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
