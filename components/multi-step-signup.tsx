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
import { User, Building2, HardHat, ArrowRight, ArrowLeft, Loader2, Check, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n/context"

interface SignupData {
  accountType: "individual" | "company" | null
  email: string
  password: string
  confirmPassword: string
  // Individual fields
  firstName: string
  lastName: string
  title: string
  // Company fields
  companyName: string
  industry: string
  services: string[]
  // Common fields
  phone: string
  postcode: string
  location: string
  latitude: number | null
  longitude: number | null
  // Legal requirements
  ageConfirmation: boolean
  termsAccepted: boolean
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
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'facebook' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false)
  const [serviceInput, setServiceInput] = useState('')
  const [emailLocked, setEmailLocked] = useState(false)

  const [signupData, setSignupData] = useState<SignupData>({
    accountType: null,
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    title: "",
    companyName: "",
    industry: "",
    services: [],
    phone: "",
    postcode: "",
    location: "",
    latitude: null,
    longitude: null,
    ageConfirmation: false,
    termsAccepted: false,
  })

  const [isGeocodingPostcode, setIsGeocodingPostcode] = useState(false)

  const updateSignupData = (updates: Partial<SignupData>) => {
    setSignupData(prev => ({ ...prev, ...updates }))
    if (updates.email !== undefined) setEmailAlreadyExists(false)
  }

  // Read URL parameters to pre-populate form
  useEffect(() => {
    const accountTypeParam = searchParams?.get('accountType')
    const sourceParam      = searchParams?.get('source')
    const claimToken       = searchParams?.get('claimToken')
    const companyNameParam = searchParams?.get('companyName')
    const emailParam       = searchParams?.get('email')
    const postcodeParam    = searchParams?.get('postcode')
    const lockEmailParam   = searchParams?.get('lock_email')

    if (claimToken) {
      // Claim flow: auto-set company account, pre-fill all known fields, skip to step 2
      const postcode = postcodeParam ? postcodeParam.toUpperCase() : ""
      setSignupData(prev => ({
        ...prev,
        accountType: 'company',
        ...(companyNameParam ? { companyName: companyNameParam } : {}),
        ...(emailParam       ? { email: emailParam }             : {}),
        ...(postcode         ? { postcode }                      : {}),
      }))
      if (lockEmailParam === 'true') setEmailLocked(true)
      setCurrentStep(2)
      if (postcode) geocodePostcode(postcode)
    } else if (sourceParam === 'quickcheck' && accountTypeParam) {
      const accountType = accountTypeParam as 'individual' | 'company'
      setSignupData(prev => ({ ...prev, accountType }))
      setCurrentStep(2)
    }
  }, [searchParams])

  const canProceedFromStep1 = signupData.accountType !== null

  // Geocode postcode using Nominatim
  const geocodePostcode = async (postcode: string) => {
    if (!postcode || postcode.length < 3) return

    setIsGeocodingPostcode(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postcode)}&country=gb&format=json&limit=1`,
        { headers: { 'User-Agent': 'OpenJobMarket/1.0' } }
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        updateSignupData({
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          location: result.display_name?.split(',').slice(0, 3).join(',') || postcode
        })
      }
    } catch (err) {
      console.error('[SIGNUP] Postcode geocoding error:', err)
    } finally {
      setIsGeocodingPostcode(false)
    }
  }

  const validateStep2 = async () => {
    setError(null)

    const isIndividual = signupData.accountType === "individual"

    if (!signupData.email || !signupData.password) {
      setError(t('signup.fillAllFields'))
      return false
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signupData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    // Check password length
    if (signupData.password.length < 6) {
      setError(t('signup.passwordTooShort'))
      return false
    }

    // Check terms acceptance
    if (!signupData.termsAccepted) {
      setError(t('signup.mustAcceptTerms') || 'You must accept the Terms & Conditions')
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

    // Postcode is required (used as location fallback even if geocoding didn't complete)
    if (!signupData.postcode) {
      setError(t('signup.selectLocationRequired') || 'Please enter your postcode')
      return false
    }

    return true
  }

  // Social login handler
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError(null)
    setIsSocialLoading(provider)

    try {
      const supabase = createClient()

      // Store account type preference in localStorage for post-OAuth completion
      if (signupData.accountType) {
        localStorage.setItem('oauth_account_type', signupData.accountType)
      }

      // Pass account_type only when the user pre-selected one. If nothing was
      // selected, we omit the param so the callback routes to /auth/choose-role.
      const callbackBase = `${window.location.origin}/auth/callback`
      const callbackUrl = signupData.accountType
        ? `${callbackBase}?account_type=${signupData.accountType}`
        : callbackBase
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error(`[SIGNUP] ${provider} login error:`, error)
        setError(`Failed to sign in with ${provider === 'google' ? 'Google' : 'Facebook'}. Please try again.`)
        setIsSocialLoading(null)
      }
    } catch (err: any) {
      console.error(`[SIGNUP] ${provider} login exception:`, err)
      setError(`An error occurred. Please try again.`)
      setIsSocialLoading(null)
    }
  }

  const handleSignup = async () => {
    setError(null)
    setIsLoading(true)

    const isIndividual = signupData.accountType === "individual"

    // ── Homeowner fast-path: admin API creates account without OTP ────────────
    if (isIndividual) {
      try {
        const res = await fetch("/api/auth/signup-homeowner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email:     signupData.email.trim().toLowerCase(),
            password:  signupData.password,
            firstName: signupData.firstName,
            lastName:  signupData.lastName,
            postcode:  signupData.postcode,
            phone:     signupData.phone || undefined,
            location:  signupData.location || signupData.postcode,
            latitude:  signupData.latitude,
            longitude: signupData.longitude,
          }),
        })

        const data = await res.json()

        if (res.status === 409 || data.error === "email_exists") {
          setEmailAlreadyExists(true)
          setIsLoading(false)
          return
        }
        if (!res.ok) {
          throw new Error(data.error ?? "Signup failed")
        }

        // Account created and email confirmed — sign in immediately (no OTP needed)
        const supabase = createClient()
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email:    signupData.email.trim().toLowerCase(),
          password: signupData.password,
        })
        if (signInErr) throw signInErr

        router.push(dashboardUrl)
      } catch (err: any) {
        console.error("[SIGNUP] Homeowner signup error:", err)
        let msg = err.message ?? "An error occurred. Please try again."
        if (msg.includes("already")) msg = "This email is already registered. Please sign in."
        setError(msg)
        setIsLoading(false)
      }
      return
    }

    // ── Company / tradesperson: keep original flow (with OTP) ─────────────────
    try {
      const supabase = createClient()

      const userType = "company"
      const dbAccountType = "business"

      const metadata: Record<string, any> = {
        user_type:       userType,
        account_type:    dbAccountType,
        is_jobseeker:    false,
        is_homeowner:    false,
        is_employer:     true,
        is_tradespeople: true,
      }

      if (signupData.companyName) metadata.company_name = signupData.companyName
      metadata.display_name = signupData.companyName || signupData.email.split("@")[0]
      if (signupData.title)    metadata.title    = signupData.title
      if (signupData.industry) metadata.industry = signupData.industry
      if (signupData.services && signupData.services.length > 0) {
        metadata.trade    = signupData.services[0]
        metadata.services = signupData.services.filter(s => s)
      }
      if (signupData.phone) {
        metadata.phone        = signupData.phone
        metadata.phone_number = signupData.phone
      }
      if (signupData.location)  metadata.location  = signupData.location
      else if (signupData.postcode) metadata.location = signupData.postcode
      if (signupData.latitude  !== undefined) metadata.latitude  = signupData.latitude
      if (signupData.longitude !== undefined) metadata.longitude = signupData.longitude

      console.log("[SIGNUP] Company metadata:", { email: signupData.email, metadata })

      // Include the claim token in the callback URL so the link-click path also
      // processes the claim (without this, users who click the link instead of
      // entering the OTP code land on the dashboard without the claim being linked).
      const claimTokenParam = searchParams?.get('claimToken')
      const callbackUrl = claimTokenParam
        ? `${window.location.origin}/auth/callback?claimToken=${encodeURIComponent(claimTokenParam)}`
        : `${window.location.origin}/auth/callback`

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email:    signupData.email.trim().toLowerCase(),
        password: signupData.password,
        options: {
          emailRedirectTo: callbackUrl,
          data: metadata,
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error("Failed to create user")

      if (!authData.user.identities || authData.user.identities.length === 0) {
        setEmailAlreadyExists(true)
        setIsLoading(false)
        return
      }

      localStorage.setItem('signup_email', signupData.email)

      if (!authData.user.email_confirmed_at) {
        const claimToken = searchParams?.get('claimToken')
        let verifyEmailUrl: string
        if (claimToken) {
          verifyEmailUrl = `/auth/verify-email?email=${encodeURIComponent(signupData.email)}&claimToken=${encodeURIComponent(claimToken)}`
        } else if (isOnBrRoute) {
          verifyEmailUrl = `/auth/verify-email?locale=pt-BR&email=${encodeURIComponent(signupData.email)}`
        } else {
          verifyEmailUrl = `/auth/verify-email?email=${encodeURIComponent(signupData.email)}`
        }
        router.push(verifyEmailUrl)
      } else {
        router.push(dashboardUrl)
      }
    } catch (err: any) {
      console.error("[SIGNUP] Company signup error:", err)
      let errorMessage = ""
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
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
    <div className="w-full max-w-md mx-auto">
      {/* Full-screen overlay while OAuth browser is loading */}
      {isSocialLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-slate-300 text-sm">
            Connecting to {isSocialLoading === 'google' ? 'Google' : 'Facebook'}…
          </p>
        </div>
      )}

      <div className="hidden sm:flex items-center justify-center gap-2 mb-6">
        <span className="text-white font-bold text-lg tracking-tight">Open Job Market</span>
      </div>

      <Card className="bg-slate-900 border border-slate-700/60 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_64px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.04]">
        {/* Thin emerald top accent */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent rounded-t-xl" />
        <CardHeader className="pb-1 pt-2 sm:pb-4 sm:pt-6">
          <CardTitle className="text-sm sm:text-2xl text-white text-center leading-tight">{t('signup.title')}</CardTitle>
          <CardDescription className="text-slate-400 text-center text-xs sm:text-sm mt-0.5">
            {t('signup.step')} {currentStep} {t('signup.of')} 2
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          {emailAlreadyExists && (
            <div className="mb-4 p-4 bg-amber-900/40 border border-amber-600/60 rounded-xl space-y-3">
              <p className="text-sm font-semibold text-amber-300">This email already has an account.</p>
              <p className="text-xs text-amber-400/80">Sign in to your existing account, or resend the verification email if you haven't confirmed it yet.</p>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
              >
                Go to Sign In →
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const supabase = createClient()
                    await supabase.auth.resend({ type: 'signup', email: signupData.email.trim().toLowerCase() })
                    setError(null)
                    setEmailAlreadyExists(false)
                    const url = `/auth/verify-email?email=${encodeURIComponent(signupData.email)}`
                    router.push(url)
                  } catch { /* ignore */ }
                }}
                className="w-full py-2 rounded-lg border border-amber-600/60 text-amber-300 text-sm font-medium hover:bg-amber-900/30 transition-colors"
              >
                Resend verification email
              </button>
            </div>
          )}
          {error && !emailAlreadyExists && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

        {/* Step 1: Account Type */}
        {currentStep === 1 && (
          <div className="space-y-5">

            {/* Account type — MUST be selected first ──────────────────── */}
            <div>
              <p className="text-sm font-semibold text-slate-200 text-center mb-3">
                First, choose your account type
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <button
                  onClick={() => updateSignupData({ accountType: "individual" })}
                  className={`p-2.5 sm:p-4 border-2 rounded-xl text-center transition-all overflow-hidden ${
                    signupData.accountType === "individual"
                      ? "border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                      : "border-slate-700 hover:border-slate-500 bg-slate-800/50"
                  }`}
                >
                  <div className={`mx-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-1.5 ${
                    signupData.accountType === "individual" ? "bg-blue-500" : "bg-slate-700"
                  }`}>
                    <User className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${signupData.accountType === "individual" ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <h4 className="font-semibold text-[11px] sm:text-xs mb-0.5 text-white break-words leading-tight">{t('signup.individual')}</h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 leading-tight break-words">{t('signup.individualDesc')}</p>
                </button>

                <button
                  onClick={() => updateSignupData({ accountType: "company" })}
                  className={`p-2.5 sm:p-4 border-2 rounded-xl text-center transition-all overflow-hidden ${
                    signupData.accountType === "company"
                      ? "border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20"
                      : "border-slate-700 hover:border-slate-500 bg-slate-800/50"
                  }`}
                >
                  <div className={`mx-auto w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center mb-1.5 ${
                    signupData.accountType === "company" ? "bg-orange-500" : "bg-slate-700"
                  }`}>
                    <HardHat className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${signupData.accountType === "company" ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <h4 className="font-semibold text-[11px] sm:text-xs mb-0.5 text-white break-words leading-tight">{t('signup.business')}</h4>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 leading-tight break-words">{t('signup.companyDesc')}</p>
                </button>
              </div>
            </div>

            {/* OAuth buttons — role must be selected first ──────────── */}
            {!signupData.accountType && (
              <p className="text-xs text-amber-400 text-center -mb-1">
                ↑ Select your account type above to continue
              </p>
            )}
            <div className={`grid grid-cols-2 gap-3 transition-opacity ${signupData.accountType ? '' : 'opacity-40 pointer-events-none'}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={isSocialLoading !== null || !signupData.accountType}
                className="h-11 border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
              >
                {isSocialLoading === 'google' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isSocialLoading !== null || !signupData.accountType}
                className="h-11 border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
              >
                {isSocialLoading === 'facebook' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </>
                )}
              </Button>
            </div>

            {/* Divider ──────────────────────────────────────────────────── */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-slate-900 text-slate-500">or continue with email</span>
              </div>
            </div>

            <Button
              onClick={nextStep}
              disabled={!canProceedFromStep1}
              className="w-full h-11 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40"
            >
              {t('common.continue')} with email
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Profile Setup */}
        {currentStep === 2 && (
          <div className="space-y-4">

            <div className="space-y-3">
              {signupData.accountType === "individual" ? (
                <>
                  {/* Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-slate-300">{t('signup.firstNameLabel')} *</Label>
                      <Input
                        id="firstName"
                        value={signupData.firstName}
                        onChange={(e) => updateSignupData({ firstName: e.target.value })}
                        placeholder={t('signup.firstNamePlaceholder')}
                        required
                        className="mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-slate-300">{t('signup.lastNameLabel')} *</Label>
                      <Input
                        id="lastName"
                        value={signupData.lastName}
                        onChange={(e) => updateSignupData({ lastName: e.target.value })}
                        placeholder={t('signup.lastNamePlaceholder')}
                        required
                        className="mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Email & Postcode Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                        {t('signup.emailLabel')} *
                        {emailLocked && <span className="ml-1.5 text-[10px] text-amber-400 font-normal">(locked)</span>}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={signupData.email}
                        onChange={(e) => { if (!emailLocked) updateSignupData({ email: e.target.value }) }}
                        readOnly={emailLocked}
                        placeholder="you@email.com"
                        autoComplete="email"
                        required
                        className={`mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 ${emailLocked ? 'opacity-75 cursor-not-allowed select-none' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postcode" className="text-sm font-medium text-slate-300">{t('signup.postcodeLabel') || 'Postcode'} *</Label>
                      <Input
                        id="postcode"
                        value={signupData.postcode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase()
                          updateSignupData({ postcode: value })
                        }}
                        onBlur={() => geocodePostcode(signupData.postcode)}
                        placeholder="SW1A 1AA"
                        className="mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                      {isGeocodingPostcode && <p className="text-xs text-slate-400 mt-0.5">Looking up...</p>}
                      {signupData.location && !isGeocodingPostcode && (
                        <p className="text-xs text-emerald-400 mt-0.5 flex items-center"><Check className="h-3 w-3 mr-1" />{signupData.location.split(',')[0]}</p>
                      )}
                    </div>
                  </div>

                  {/* Password — single field for homeowners, no confirm needed */}
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-slate-300">{t('signup.passwordLabel')} *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={signupData.password}
                        onChange={(e) => updateSignupData({ password: e.target.value })}
                        placeholder="Min 6 characters"
                        autoComplete="new-password"
                        required
                        className="h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        id="ageConfirmation"
                        checked={signupData.ageConfirmation}
                        onCheckedChange={(checked) => updateSignupData({ ageConfirmation: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-sm text-slate-300">{t('signup.ageConfirmation')} *</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        id="termsAccepted"
                        checked={signupData.termsAccepted}
                        onCheckedChange={(checked) => updateSignupData({ termsAccepted: checked as boolean })}
                        className="mt-0.5 border-slate-500 data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-sm text-slate-300">
                        {t('signup.agreeToTerms') || 'I agree to the'}{' '}
                        <Link href="/terms" target="_blank" className="text-emerald-400 hover:underline">
                          {t('signup.termsAndConditions') || 'Terms & Conditions'}
                        </Link> *
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  {/* Business Name */}
                  <div>
                    <Label htmlFor="companyName" className="text-sm font-medium text-slate-300">{t('signup.companyNameLabel')} *</Label>
                    <Input
                      id="companyName"
                      value={signupData.companyName}
                      onChange={(e) => updateSignupData({ companyName: e.target.value })}
                      placeholder={t('signup.companyNamePlaceholder')}
                      required
                      className="mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Email & Postcode Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                        {t('signup.emailLabel')} *
                        {emailLocked && <span className="ml-1.5 text-[10px] text-amber-400 font-normal">(locked)</span>}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={signupData.email}
                        onChange={(e) => { if (!emailLocked) updateSignupData({ email: e.target.value }) }}
                        readOnly={emailLocked}
                        placeholder="you@company.com"
                        autoComplete="email"
                        required
                        className={`mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 ${emailLocked ? 'opacity-75 cursor-not-allowed select-none' : ''}`}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postcode" className="text-sm font-medium text-slate-300">{t('signup.postcodeLabel') || 'Postcode'} *</Label>
                      <Input
                        id="postcode"
                        value={signupData.postcode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase()
                          updateSignupData({ postcode: value })
                        }}
                        onBlur={() => geocodePostcode(signupData.postcode)}
                        placeholder="SW1A 1AA"
                        className="mt-1 h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                      />
                      {isGeocodingPostcode && <p className="text-xs text-slate-400 mt-0.5">Looking up...</p>}
                      {signupData.location && !isGeocodingPostcode && (
                        <p className="text-xs text-emerald-400 mt-0.5 flex items-center"><Check className="h-3 w-3 mr-1" />{signupData.location.split(',')[0]}</p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-slate-300">{t('signup.passwordLabel')} *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={signupData.password}
                        onChange={(e) => updateSignupData({ password: e.target.value })}
                        placeholder="Min 6 characters"
                        autoComplete="new-password"
                        required
                        className="h-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        id="termsAccepted"
                        checked={signupData.termsAccepted}
                        onCheckedChange={(checked) => updateSignupData({ termsAccepted: checked as boolean })}
                        className="mt-0.5 border-slate-500 data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-sm text-slate-300">
                        {t('signup.agreeToTerms') || 'I agree to the'}{' '}
                        <Link href="/terms" target="_blank" className="text-emerald-400 hover:underline">
                          {t('signup.termsAndConditions') || 'Terms & Conditions'}
                        </Link> *
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={prevStep} disabled={isLoading} className="flex-1 h-11 border-slate-600 text-slate-300 hover:bg-slate-800">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={nextStep} disabled={isLoading} className="flex-1 h-11 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white">
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
          <span className="text-slate-400">{t('auth.alreadyHaveAccount')} </span>
          <Link href={isOnBrRoute ? `/auth/login?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}` : '/auth/login'} className="text-emerald-400 hover:underline font-medium">
            {t('nav.signIn')}
          </Link>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
