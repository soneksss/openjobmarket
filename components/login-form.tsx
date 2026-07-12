"use client"

import type React from "react"

import { createClient } from "@/lib/client"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

export default function LoginForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [staySignedIn, setStaySignedIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'facebook' | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  // Brute-force protection — 5 failed attempts locks this email out for a
  // 2-minute cooldown, enforced server-side (see /api/auth/login-guard).
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const t = setTimeout(() => setCooldownSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldownSeconds])

  // Locale-aware sign-up URL
  const isOnBrRoute = pathname?.startsWith('/br')
  const signUpUrl = isOnBrRoute
    ? `/auth/sign-up?locale=pt-BR&returnUrl=${encodeURIComponent(pathname || '/br')}`
    : '/auth/sign-up'


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      if (!email || !password) {
        throw new Error(t('auth.errorMissingBoth'))
      }

      // Brute-force guard — checked BEFORE attempting sign-in. Blocks the
      // attempt if this email has been locked out from 5 recent failures.
      const guardRes = await fetch("/api/auth/login-guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).then((r) => r.json()).catch(() => ({ blocked: false }))

      if (guardRes.blocked) {
        if (typeof guardRes.retryAfterSeconds === "number") setCooldownSeconds(guardRes.retryAfterSeconds)
        setError("Too many failed attempts. Please wait for the cooldown to finish before trying again.")
        setIsLoading(false)
        return
      }

      if (staySignedIn) {
        localStorage.setItem('staySignedIn', 'true')
      } else {
        localStorage.removeItem('staySignedIn')
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // Record the outcome for brute-force tracking regardless of what happens next.
      fetch("/api/auth/login-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, success: !error }),
      }).then((r) => r.json()).then((data) => {
        if (data?.lockedOut && typeof data.retryAfterSeconds === "number") setCooldownSeconds(data.retryAfterSeconds)
      }).catch(() => {})

      if (error) throw error

      // Set custom session duration preferences
      if (staySignedIn) {
        // Set a long-term preference cookie for 30 days
        document.cookie = `stay_signed_in=true; max-age=${30 * 24 * 60 * 60}; path=/; samesite=lax`
      } else {
        // Set a short-term preference cookie for 24 hours
        document.cookie = `stay_signed_in=false; max-age=${24 * 60 * 60}; path=/; samesite=lax`
      }

      // Check user type and redirect appropriately
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("user_type, is_banned, ban_reason, ban_expires_at")
          .eq("id", user.id)
          .maybeSingle()
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
          router.push(isOnBrRoute ? "/br" : "/")
          return
        }

        const returnUrl = searchParams?.get("returnUrl")
        if (userData.user_type === "admin") {
          router.push("/admin/dashboard")
        } else if (returnUrl) {
          router.push(returnUrl)
        } else if (userData.user_type === "company") {
          router.push("/find-jobs")
        } else {
          router.push(isOnBrRoute ? "/br" : "/")
        }
      }
    } catch (error: unknown) {
      console.error('[LOGIN] Error during login:', error)

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

      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError(null)
    setIsSocialLoading(provider)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Social login failed. Please try again.')
      setIsSocialLoading(null)
    }
  }

  // Helper to create locale-aware paths
  const getLocalePath = (path: string) => {
    return isOnBrRoute ? `/br${path}` : path
  }

  return (
    <div className="w-full max-w-sm mx-auto">

      {/* Full-screen overlay while OAuth browser is loading */}
      {isSocialLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-slate-300 text-sm">Connecting to {isSocialLoading === 'google' ? 'Google' : 'Facebook'}…</p>
        </div>
      )}

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

          {/* Brute-force protection — cooldown countdown after 5 failed attempts */}
          {cooldownSeconds > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-400">
                Too many failed attempts. Try again in {Math.floor(cooldownSeconds / 60)}:{String(cooldownSeconds % 60).padStart(2, "0")}.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || cooldownSeconds > 0}
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

      {/* Social login */}
      <div className="mt-5">
        <div className="relative flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-xs text-slate-500 flex-shrink-0">or continue with</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSocialLoading !== null || isLoading}
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSocialLoading === 'google' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google
          </button>
          <button
            type="button"
            disabled={isSocialLoading !== null || isLoading}
            onClick={() => handleSocialLogin('facebook')}
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-slate-600 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSocialLoading === 'facebook' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            Facebook
          </button>
        </div>
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
