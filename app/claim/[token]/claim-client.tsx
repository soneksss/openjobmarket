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

type Phase = "idle" | "claiming"

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

  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)

  const tradeEmail   = trade.email?.toLowerCase() ?? null
  const userEmail    = user?.email?.toLowerCase() ?? null
  const emailMatches = tradeEmail && userEmail && tradeEmail === userEmail

  /* ── Redirect unauthenticated users to signup with locked email ─────────── */

  const handleRegister = () => {
    if (!trade.email) return
    const params = new URLSearchParams({
      email:       trade.email,
      lock_email:  "true",
      claimToken:  token,
      accountType: "company",
      ...(trade.company_name ? { companyName: trade.company_name } : {}),
      ...(trade.postcode     ? { postcode:    trade.postcode }     : {}),
    })
    router.push(`/auth/sign-up?${params.toString()}`)
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
                  disabled={phase === "claiming"}
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
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-sm text-slate-400 leading-relaxed">
              To claim this listing, register with the business email above.
              Your email will be verified to confirm you own this business.
            </div>
            <button
              onClick={handleRegister}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Mail className="w-4 h-4" />
              Register / verify email
            </button>
            <p className="text-center text-slate-500 text-xs">
              Your email will be pre-filled and locked to <span className="text-slate-300">{trade.email}</span>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
