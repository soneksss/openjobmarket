"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { Building2, MapPin, Phone, Mail, CheckCircle, AlertCircle, ArrowRight, LogIn } from "lucide-react"

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

export default function ClaimClient({
  trade,
  token,
  user,
}: {
  trade: Trade
  token: string
  user: any
}) {
  const router = useRouter()
  const supabase = createClient()

  const [claiming, setClaiming] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleClaim = async () => {
    setClaiming(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc("claim_seeded_business", {
        p_token: token,
      })

      if (rpcError) throw rpcError

      // data is the new company_profile id
      router.push("/dashboard/company")
    } catch (err: any) {
      const msg: string = err?.message ?? ""
      if (msg.includes("invalid_or_claimed_token")) {
        setError("This listing has already been claimed or the link is invalid.")
      } else {
        setError("Something went wrong. Please try again.")
      }
      setClaiming(false)
    }
  }

  const handleSignIn = () => {
    const returnUrl = `/claim/${token}`
    router.push(`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  const handleSignUp = () => {
    const returnUrl = `/claim/${token}`
    router.push(`/auth/sign-up?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

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
            Verify you own this listing to manage it on Open Job Market
          </p>
        </div>

        {/* Business card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 mb-6">
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
            {trade.email && (
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="truncate">{trade.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Action */}
        {!user ? (
          <div className="space-y-3">
            <p className="text-center text-slate-400 text-sm mb-4">
              Sign in or create an account to claim this listing
            </p>
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <LogIn className="w-4 h-4" />
              Sign in to claim
            </button>
            <button
              onClick={handleSignUp}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold rounded-xl transition-colors"
            >
              Create a free account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-sm">
                Signed in as <span className="font-semibold">{user.email}</span>
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/25"
            >
              {claiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Claiming…
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Claim this business
                </>
              )}
            </button>
            <p className="text-center text-slate-500 text-xs">
              By claiming, you confirm you are authorised to manage this business listing.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
