'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/client"

const REASONS = [
  { value: "not_using", label: "I no longer use the platform" },
  { value: "found_work", label: "I found work / hired someone" },
  { value: "privacy", label: "Privacy concerns" },
  { value: "too_many_emails", label: "Too many emails / notifications" },
  { value: "switching_service", label: "Switching to another service" },
  { value: "other", label: "Other reason" },
]

export default function DeleteAccountPage() {
  const router = useRouter()
  const [step, setStep] = useState<"confirm" | "form" | "done">("confirm")
  const [reason, setReason] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason || !email || !password) {
      setError("Please fill in all required fields.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryReason: reason,
          customMessage: customMessage || undefined,
          userEmail: email,
          userPassword: password,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || "Deletion failed. Please try again.")
        return
      }
      // Sign out client-side so auth state clears immediately
      await supabase.auth.signOut()
      setStep("done")
      setTimeout(() => { window.location.href = "/" }, 3000)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Account deleted</h2>
          <p className="text-slate-400 text-sm">Your account has been permanently deleted. Redirecting you to the home page…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700/50">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard/homeowner"
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-white">Delete Account</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

        {/* Warning banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">This cannot be undone</p>
            <p className="text-xs text-red-400/80 leading-relaxed">
              All your data — profile, jobs, applications, messages, and reviews — will be permanently deleted.
            </p>
          </div>
        </div>

        {step === "confirm" && (
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-semibold text-white">Before you go…</h2>
            <p className="text-sm text-slate-400">
              Are you sure you want to permanently delete your account? You will lose access to all your jobs, messages, and profile data.
            </p>
            <div className="flex gap-3 pt-1">
              <Link
                href="/dashboard/homeowner"
                className="flex-1 text-center text-sm font-medium py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
              >
                Keep Account
              </Link>
              <button
                onClick={() => setStep("form")}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors border border-red-500/30"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleDelete} className="space-y-4">
            {/* Reason */}
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 space-y-3">
              <label className="text-sm font-semibold text-white">Why are you leaving? *</label>
              <div className="space-y-2">
                {REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      reason === r.value
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-slate-600 group-hover:border-slate-400"
                    }`}>
                      {reason === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      className="sr-only"
                      onChange={() => setReason(r.value)}
                    />
                    <span className="text-sm text-slate-300">{r.label}</span>
                  </label>
                ))}
              </div>
              {reason === "other" && (
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Tell us more (optional)…"
                  rows={3}
                  className="w-full mt-2 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              )}
            </div>

            {/* Password confirmation */}
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              <p className="text-sm font-semibold text-white">Confirm your identity</p>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Email address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your current password"
                    required
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="flex-1 text-sm font-medium py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors border border-slate-600"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 transition-colors border border-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Delete my account</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
