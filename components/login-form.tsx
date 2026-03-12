"use client"

import type React from "react"

import { createClient } from "@/lib/client"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function LoginForm() {
  console.log('[LOGIN-FORM] Component is rendering')
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [staySignedIn, setStaySignedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
          // No user type — send to home, they can choose from there
          addLog('[LOGIN] No user type, redirecting to home')
          router.push(isOnBrRoute ? "/br" : "/")
          return
        }

        addLog('[LOGIN] User type: ' + userData.user_type)

        // Admins go to admin dashboard; all other users land on the home page
        // where role-appropriate content is shown (For Homeowners / For Tradespeople)
        if (userData.user_type === "admin") {
          router.push("/admin/dashboard")
        } else {
          const home = isOnBrRoute ? "/br" : "/"
          addLog('[LOGIN] Redirecting to home: ' + home)
          router.push(home)
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
    <div className="w-full max-w-sm mx-auto">

      {/* Back link */}
      <Link
        href={getLocalePath("/")}
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500 mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">{t('auth.welcomeBack')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('auth.signInDescription')}</p>
      </div>

      {/* Card */}
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-6 space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin(e)
          }}
          className="space-y-5"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              {t('common.email')}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-0 rounded-xl h-11"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                {t('common.password')}
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-0 rounded-xl h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Stay signed in */}
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="stay-signed-in"
              checked={staySignedIn}
              onCheckedChange={(checked) => setStaySignedIn(checked === true)}
              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-slate-600 rounded"
            />
            <label
              htmlFor="stay-signed-in"
              className="text-sm text-slate-400 cursor-pointer select-none"
            >
              {t('auth.staySignedIn')}
              <span className="text-xs text-slate-600 ml-1">{t('auth.recommended')}</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('auth.signingIn')}
              </>
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm text-slate-500 mt-6">
        {t('auth.dontHaveAccount')}{" "}
        <Link href={signUpUrl} className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          {t('auth.signUp')}
        </Link>
      </p>
    </div>
  )
}
