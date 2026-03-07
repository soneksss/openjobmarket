"use client"

import type React from "react"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2, X } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function LoginForm() {
  console.log('[LOGIN-FORM] Component is rendering')
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [staySignedIn, setStaySignedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Locale-aware sign-up URL
  const isOnBrRoute = pathname?.startsWith('/br')
  const signUpUrl = isOnBrRoute
    ? `/auth/sign-up?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/sign-up'

  console.log('[LOGIN-FORM] State:', { email, password, isLoading, hasError: !!error })

  // Verify component mounted
  useEffect(() => {
    console.log('[LOGIN-FORM] Component MOUNTED')

    // Display previous login attempt logs in console only
    const storedLogs = localStorage.getItem('loginDebugLog')
    if (storedLogs) {
      console.log('=== PREVIOUS LOGIN ATTEMPT LOGS ===')
      try {
        const logs = JSON.parse(storedLogs)
        logs.forEach((log: string) => console.log(log))
        console.log('=== END PREVIOUS LOGIN LOGS ===')
      } catch (e) {
        console.error('Failed to parse login logs:', e)
      }
      // Clear the logs after displaying
      localStorage.removeItem('loginDebugLog')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    console.log('[LOGIN] handleLogin FIRED - event type:', e.type, 'preventDefault exists:', !!e.preventDefault)
    e.preventDefault()
    console.log('[LOGIN] preventDefault called successfully')
    console.log('[LOGIN] Email state:', email, 'length:', email?.length)
    console.log('[LOGIN] Password state length:', password?.length)
    console.log('[LOGIN] Stay signed in:', staySignedIn)

    // Create debug log array
    const debugLog: string[] = []
    const addLog = (msg: string) => {
      console.log(msg)
      debugLog.push(`${new Date().toISOString()}: ${msg}`)
      localStorage.setItem('loginDebugLog', JSON.stringify(debugLog))
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      addLog('[LOGIN] Starting authentication with email: ' + email)

      // Validate inputs before sending
      if (!email || !password) {
        throw new Error(t('auth.errorMissingBoth'))
      }

      // Store the stay signed in preference
      if (staySignedIn) {
        localStorage.setItem('staySignedIn', 'true')
      } else {
        localStorage.removeItem('staySignedIn')
      }

      addLog('[LOGIN] Calling signInWithPassword...')
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      addLog('[LOGIN] signInWithPassword returned, error: ' + (error?.message || 'none') + ', has data: ' + !!authData)
      if (error) throw error
      addLog('[LOGIN] Authentication successful, has session: ' + !!authData.session)

      // Set custom session duration preferences
      if (staySignedIn) {
        // Set a long-term preference cookie for 30 days
        document.cookie = `stay_signed_in=true; max-age=${30 * 24 * 60 * 60}; path=/; samesite=lax`
      } else {
        // Set a short-term preference cookie for 24 hours
        document.cookie = `stay_signed_in=false; max-age=${24 * 60 * 60}; path=/; samesite=lax`
      }

      // Check user type and redirect appropriately
      addLog('[LOGIN] Fetching user data...')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      addLog('[LOGIN] User fetched: ' + user?.id + ', email: ' + user?.email)
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type, is_banned, ban_reason, ban_expires_at")
          .eq("id", user.id)
          .maybeSingle()
        addLog('[LOGIN] User type: ' + userData?.user_type)
        addLog('[LOGIN] Ban status: ' + userData?.is_banned)

        // Check if user is banned
        if (userData?.is_banned) {
          // Check if ban has expired
          if (userData.ban_expires_at) {
            const banExpiry = new Date(userData.ban_expires_at)
            const now = new Date()
            if (banExpiry < now) {
              // Ban has expired, auto-unban
              await supabase
                .from("users")
                .update({
                  is_banned: false,
                  ban_reason: null,
                  ban_expires_at: null
                })
                .eq("id", user.id)
              addLog('[LOGIN] Ban expired, user automatically unbanned')
            } else {
              // Ban is still active
              await supabase.auth.signOut()
              setError(
                t('auth.errorBannedTemporary')
                  .replace('{reason}', userData.ban_reason || 'No reason provided')
                  .replace('{date}', banExpiry.toLocaleDateString())
              )
              setIsLoading(false)
              return
            }
          } else {
            // Permanent ban
            await supabase.auth.signOut()
            setError(
              t('auth.errorBannedPermanent')
                .replace('{reason}', userData.ban_reason || 'No reason provided')
            )
            setIsLoading(false)
            return
          }
        }

        if (!userData?.user_type) {
          // User exists but no profile type set - redirect to onboarding
          addLog('[LOGIN] No user type, redirecting to onboarding')
          const onboardingUrl = isOnBrRoute
            ? '/onboarding?locale=pt-BR&returnUrl=/br'
            : '/onboarding'
          router.push(onboardingUrl)
          return
        }

        // Check if user has complete profile
        let hasCompleteProfile = false

        if (userData.user_type === "professional") {
          const { data: professionalProfile } = await supabase
            .from("professional_profiles")
            .select("id, first_name, last_name")
            .eq("user_id", user.id)
            .maybeSingle()

          hasCompleteProfile = !!(professionalProfile?.first_name && professionalProfile?.last_name)

          if (hasCompleteProfile) {
            addLog('[LOGIN] Redirecting to search page')
            router.push(isOnBrRoute ? "/br" : "/")
          } else {
            addLog('[LOGIN] Redirecting to onboarding (incomplete)')
            const onboardingUrl = isOnBrRoute
              ? '/onboarding?locale=pt-BR&returnUrl=/br'
              : '/onboarding'
            router.push(onboardingUrl)
          }
        } else if (userData.user_type === "company" || userData.user_type === "employer") {
          const { data: companyProfile } = await supabase
            .from("company_profiles")
            .select("id, company_name")
            .eq("user_id", user.id)
            .maybeSingle()

          hasCompleteProfile = !!companyProfile?.company_name

          if (hasCompleteProfile) {
            addLog('[LOGIN] Redirecting to search page')
            router.push(isOnBrRoute ? "/br" : "/")
          } else {
            addLog('[LOGIN] Redirecting to onboarding (incomplete)')
            const onboardingUrl = isOnBrRoute
              ? '/onboarding?locale=pt-BR&returnUrl=/br'
              : '/onboarding'
            router.push(onboardingUrl)
          }
        } else if (userData.user_type === "admin") {
          addLog('[LOGIN] Redirecting to admin dashboard')
          router.push("/admin")
        } else {
          addLog('[LOGIN] Unknown user type, redirecting to onboarding')
          const onboardingUrl = isOnBrRoute
            ? '/onboarding?locale=pt-BR&returnUrl=/br'
            : '/onboarding'
          router.push(onboardingUrl)
        }
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      addLog('[LOGIN] ERROR: ' + errorMsg)
      addLog('[LOGIN] Error type: ' + typeof error)
      console.error('[LOGIN] Error during login:', error)
      console.error('[LOGIN] Error stack:', error instanceof Error ? error.stack : 'N/A')

      // Provide user-friendly error messages
      let errorMessage = error instanceof Error ? error.message : String(error)
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = t('auth.errorInvalidCredentials')
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = t('auth.errorEmailNotConfirmed')
        } else if (error.message.includes("User not found")) {
          errorMessage = t('auth.errorUserNotFound')
        } else if (error.message.includes("missing email")) {
          errorMessage = t('auth.errorMissingEmail')
        }
      }

      addLog('[LOGIN] Setting error message: ' + errorMessage)
      setError(errorMessage)
      setIsLoading(false)
    } finally {
      addLog('[LOGIN] Login process finished')
    }
  }

  // Helper to create locale-aware paths
  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  return (
    <Card className="w-full max-w-md relative">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-muted z-10 rounded-full"
      >
        <Link href={getLocalePath("/")}>
          <X className="h-4 w-4" />
          <span className="sr-only">{t('common.close')}</span>
        </Link>
      </Button>

      <CardHeader className="text-center pt-6">
        <CardTitle className="text-2xl">{t('auth.welcomeBack')}</CardTitle>
        <CardDescription>{t('auth.signInDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            console.log('[FORM] Form submit event triggered')
            e.preventDefault()
            handleLogin(e)
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                required
                value={email}
                onChange={(e) => {
                  console.log('[LOGIN-INPUT] Email changed:', e.target.value)
                  setEmail(e.target.value)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('common.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  console.log('[LOGIN-INPUT] Password changed, length:', e.target.value.length)
                  setPassword(e.target.value)
                }}
              />
            </div>

            {/* Stay signed in checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stay-signed-in"
                checked={staySignedIn}
                onCheckedChange={(checked) => setStaySignedIn(checked === true)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="stay-signed-in"
                className="text-sm font-normal cursor-pointer flex items-center gap-1"
              >
                {t('auth.staySignedIn')}
                <span className="text-xs text-muted-foreground">{t('auth.recommended')}</span>
              </Label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.signingIn')}
                </>
              ) : (
                t('auth.signIn')
              )}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm space-y-2">
            <Link href="/auth/forgot-password" className="text-primary hover:underline block">
              {t('auth.forgotPassword')}
            </Link>
            <div>
              {t('auth.dontHaveAccount')}{" "}
              <Link href={signUpUrl} className="underline underline-offset-4">
                {t('auth.signUp')}
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
