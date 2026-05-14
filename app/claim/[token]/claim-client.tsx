"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import {
  Building2, MapPin, Phone, Mail, CheckCircle, AlertCircle,
  Lock, ShieldCheck, LogOut, Loader2,
} from "lucide-react"

type Trade = {
  id: string
  company_name: string
  trade_category: string | null
  address: string | null
  postcode: string | null
  phone: string | null
  email: string | null
  claim_token: string
}

type Phase = "idle" | "otp_sent" | "verifying" | "claiming"

export default function ClaimClient({
  trade,
  token,
  user,
}: {
  trade: Trade
  token: string
  user: any
}) {
  const router   = useRouter()
  const supabase = createClient()

  const [phase,   setPhase]   = useState<Phase>("idle")
  const [otpCode, setOtpCode] = useState("")
  const [error,   setError]   = useState<string | null>(null)

  const tradeEmail  = trade.email?.toLowerCase() ?? null
  const userEmail   = user?.email?.toLowerCase() ?? null
  const emailMatches = tradeEmail && userEmail && tradeEmail === userEmail

  /* ── OTP flow (unauthenticated) ─────────────────────────────────────────── */

  const handleSendOtp = async () => {
    if (!trade.email) return
    setError(null)
    setPhase("otp_sent")
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: trade.email,
        options: { shouldCreateUser: true },
      })
      if (otpErr) throw otpErr
    } catch (err: any) {
      setError("Failed to send the verification email. Please try again.")
      setPhase("idle")
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otpCode.trim()
    if (code.length !== 6) { setError("Please enter the 6-digit code from your email."); return }
    setError(null)
    setPhase("verifying")
    try {
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: trade.email!,
        token: code,
        type: "email",
      })
      if (verifyErr) throw verifyErr

      // Ensure users table row exists (new accounts from OTP may need profile setup)
      if (verifyData.user) {
        await supabase.rpc("complete_user_profile_after_verification", {
          p_user_id: verifyData.user.id,
        }).catch(() => {})
      }

      await doClaim()
    } catch (err: any) {
      const msg: string = err?.message ?? ""
      if (msg.includes("expired") || msg.includes("invalid") || msg.includes("otp")) {
        setError("The code is invalid or has expired. Click 'Resend code' to get a new one.")
      } else {
        setError("Verification failed. Please try again.")
      }
      setPhase("otp_sent")
    }
  }

  /* ── Claim RPC ───────────────────────────────────────────────────────────── */

  const doClaim = async () => {
    setPhase("claiming")
    setError(null)
    try {
      const { error: rpcErr } = await supabase.rpc("claim_seeded_business", { p_token: token })
      if (rpcErr) throw rpcErr
      router.push("/dashboard/company")
    } catch (err: any) {
      const msg: string = err?.message ?? ""
      if (msg.includes("not_authenticated")) {
        setError("Your session has expired. Please refresh the page and try again.")
      } else if (msg.includes("email_not_verified")) {
        setError("Your email could not be verified. Please complete the OTP step again.")
      } else if (msg.includes("invalid_or_claimed_token")) {
        setError("This listing has already been claimed or the link is no longer valid.")
      } else if (msg.includes("email_not_authorized_to_claim")) {
        setError("Your email does not match the business email on file. You cannot claim this listing.")
      } else {
        setError("Something went wrong. Please try again.")
      }
      setPhase("idle")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const isBusy = phase === "verifying" || phase === "claiming"

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Claim your business</h1>
          <p className="text-slate-400 text-sm">
            Verify ownership by confirming the business email address.
          </p>
        </div>

        {/* Business card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-base leading-snug">{trade.company_name}</h2>
              {trade.trade_category && (
                <p className="text-amber-400 text-xs mt-0.5">{trade.trade_category}</p>
              )}
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 rounded-full text-[10px] text-amber-300 font-semibold">
                Local business
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {(trade.address || trade.postcode) && (
              <div className="flex items-start gap-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>{trade.address ?? trade.postcode}</span>
              </div>
            )}
            {trade.phone && (
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span>{trade.phone}</span>
              </div>
            )}

            {/* Email — highlighted as the claim key */}
            <div className={`flex items-center gap-2 rounded-lg px-2.5 py-2 -mx-1 ${
              trade.email ? "bg-amber-500/8 border border-amber-500/20" : "text-slate-500"
            }`}>
              <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              {trade.email ? (
                <span className="text-amber-200 font-medium text-xs truncate">{trade.email}</span>
              ) : (
                <span className="text-slate-500 text-xs">No business email on record</span>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* No email on file — cannot claim */}
        {!trade.email && (
          <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-center">
            <p className="text-slate-400 text-sm">
              This listing has no business email on record. Please contact support to claim it.
            </p>
          </div>
        )}

        {/* ── Authenticated ────────────────────────────────────────────────── */}
        {trade.email && user && (
          <div className="space-y-4">
            {emailMatches ? (
              <>
                {/* Correct email — allow claim */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <p className="text-emerald-300 text-sm">
                    Signed in as <span className="font-semibold">{user.email}</span>
                  </p>
                </div>
                <button
                  onClick={doClaim}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/25"
                >
                  {phase === "claiming" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Claiming…</>
                  ) : (
                    <><ShieldCheck className="w-4 h-4" />Claim this business</>
                  )}
                </button>
                <p className="text-center text-slate-500 text-xs">
                  By claiming, you confirm you are authorised to manage this business listing.
                </p>
              </>
            ) : (
              <>
                {/* Wrong email — block and explain */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-300 text-sm font-semibold">Wrong email address</p>
                  </div>
                  <p className="text-amber-400/80 text-xs leading-relaxed">
                    This business can only be claimed using the email:
                  </p>
                  <p className="text-amber-200 text-sm font-semibold break-all">{trade.email}</p>
                  <p className="text-amber-400/80 text-xs">
                    You are currently signed in as <span className="font-medium">{user.email}</span>.
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out and verify with correct email
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Unauthenticated ──────────────────────────────────────────────── */}
        {trade.email && !user && (
          <>
            {/* Step: send OTP */}
            {phase === "idle" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-400 leading-relaxed">
                  We'll send a 6-digit verification code to the business email above.
                  Only someone with access to <span className="text-slate-200 font-medium">{trade.email}</span> can claim this listing.
                </div>
                <button
                  onClick={handleSendOtp}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Mail className="w-4 h-4" />
                  Verify email to claim business
                </button>
              </div>
            )}

            {/* Step: enter OTP code */}
            {(phase === "otp_sent" || phase === "verifying") && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                  <p className="text-sm text-slate-300 mb-1">
                    Code sent to <span className="font-semibold text-white">{trade.email}</span>
                  </p>
                  <p className="text-xs text-slate-500">Check your inbox and enter the 6-digit code below.</p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoFocus
                    className="w-full h-14 text-center text-2xl font-mono tracking-[0.4em] bg-slate-800 border-2 border-slate-600 focus:border-emerald-500 text-white rounded-xl outline-none transition-colors placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    disabled={otpCode.length !== 6 || isBusy}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    {isBusy ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />{phase === "claiming" ? "Claiming…" : "Verifying…"}</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" />Verify &amp; claim</>
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => { setOtpCode(""); setError(null); handleSendOtp() }}
                  disabled={isBusy}
                  className="w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
                >
                  Resend code
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
