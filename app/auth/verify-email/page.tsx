"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Mail, RefreshCw } from "lucide-react"
import Image from "next/image"

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [email, setEmail] = useState<string | null>(null)
  const [redirectLabel, setRedirectLabel] = useState("Setting up your account…")

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const emailParam = searchParams?.get("email")
    if (emailParam) {
      setEmail(emailParam)
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user?.email) setEmail(data.session.user.email)
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCooldown])

  const dashboardMap: Record<string, string> = {
    admin:     "/admin/dashboard",
    homeowner: "/dashboard/homeowner",
    company:   "/dashboard/company",
    // legacy — kept only as fallback redirects
    employer:     "/dashboard/company",
    professional: "/dashboard/company",
    jobseeker:    "/dashboard/homeowner",
    contractor:   "/dashboard/company",
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) { setError("Please enter a 6-digit code"); return }

    setLoading(true)
    setError(null)

    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email!,
        token: otp,
        type: "signup",
      })

      if (verifyError) {
        setError(verifyError.message || "Invalid or expired code")
        setLoading(false)
        return
      }

      if (verifyData.user) {
        setSuccess(true)
        setRedirectLabel("Setting up your account…")

        // Create profile
        await supabase.rpc("complete_user_profile_after_verification", {
          p_user_id: verifyData.user.id,
        })

        setRedirectLabel("Almost there…")

        const claimToken = searchParams?.get("claimToken")

        if (claimToken) {
          setRedirectLabel("Claiming your business…")
          const { error: claimErr } = await supabase.rpc("claim_seeded_business", { p_token: claimToken })
          if (claimErr) {
            const msg = claimErr.message ?? ""
            if (msg.includes("not_authenticated")) {
              setError("Session expired. Please refresh and try again.")
            } else if (msg.includes("email_not_verified")) {
              setError("Email verification required before claiming.")
            } else if (msg.includes("email_not_authorized_to_claim")) {
              setError("Your email does not match the business email on file.")
            } else {
              setError("Claim failed: " + (msg || "unknown error"))
            }
            setSuccess(false)
            setLoading(false)
            return
          }
          setRedirectLabel("Taking you to your dashboard…")
          setTimeout(() => { router.refresh(); router.push("/dashboard/company") }, 800)
        } else {
          // Retry user type fetch a couple of times (profile creation can be async)
          let userType: string | null = null
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data: userData } = await supabase
              .from("users")
              .select("user_type")
              .eq("id", verifyData.user.id)
              .single()
            if (userData?.user_type) { userType = userData.user_type; break }
            await new Promise((r) => setTimeout(r, 600))
          }

          setRedirectLabel("Taking you to your dashboard…")
          const dest = userType ? (dashboardMap[userType] ?? "/dashboard") : "/"
          setTimeout(() => { router.refresh(); router.push(dest) }, 800)
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during verification")
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email || resendCooldown > 0) return
    setResendLoading(true)
    setError(null)
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email })
      if (resendError) { setError(resendError.message) } else { setResendCooldown(60) }
    } catch (err: any) {
      setError(err.message || "Failed to resend code")
    } finally {
      setResendLoading(false)
    }
  }

  // ── Success / loading screen ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
          {/* Animated logo */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg animate-[pulse_2s_ease-in-out_infinite]">
              <Image src="/Logo.png" alt="Open Job Market" width={80} height={80} className="w-20 h-20" priority />
            </div>
            {/* Green tick badge */}
            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white mb-1">Email Verified!</h1>
            <p className="text-slate-400 text-sm">{redirectLabel}</p>
          </div>

          {/* Animated progress bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-[progress_2.4s_ease-in-out_infinite]" />
          </div>

          {/* Dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes progress {
            0%   { width: 0%; margin-left: 0; }
            50%  { width: 70%; margin-left: 15%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    )
  }

  // ── OTP entry form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg">
            <Image src="/Logo.png" alt="Open Job Market" width={56} height={56} className="w-14 h-14" priority />
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700/50 p-7">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-11 h-11 bg-emerald-900/40 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Verify Your Email</h1>
            <p className="text-slate-400 text-sm">
              {email ? (
                <>We sent a 6-digit code to <span className="text-white font-medium">{email}</span></>
              ) : (
                "We sent a 6-digit code to your email"
              )}
            </p>
            <p className="text-xs text-red-500 mt-1.5">Code expires in 10 minutes · Check your spam folder</p>
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Verification Code</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.4em] font-mono bg-slate-700 border-slate-600 text-white placeholder:text-slate-600 focus:border-emerald-500"
                autoComplete="one-time-code"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying…
                </>
              ) : "Verify Email"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-700 text-center">
            <p className="text-sm text-slate-500 mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResendCode}
              disabled={resendLoading || resendCooldown > 0}
              className="text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {resendLoading ? "Sending…" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <a href="/contact" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Need help? Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
