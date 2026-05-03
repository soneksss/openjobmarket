"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Home, HardHat, Loader2 } from "lucide-react"

export default function ChooseRoleClient() {
  const router = useRouter()
  const [loading, setLoading] = useState<"homeowner" | "company" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const choose = async (role: "homeowner" | "company") => {
    setLoading(role)
    setError(null)
    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error("Request failed")
      const { dashboardUrl } = await res.json()
      router.replace(dashboardUrl)
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">One last step</h1>
          <p className="text-slate-400 text-sm">How will you use OpenJobMarket?</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => choose("homeowner")}
            disabled={loading !== null}
            className="group p-5 border-2 rounded-2xl text-center transition-all bg-slate-800 border-slate-600 hover:border-blue-500 hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500/25 transition-colors">
              {loading === "homeowner" ? (
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              ) : (
                <Home className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Post a job</h3>
            <p className="text-xs text-slate-400 leading-snug">I need work done at home or property</p>
          </button>

          <button
            onClick={() => choose("company")}
            disabled={loading !== null}
            className="group p-5 border-2 rounded-2xl text-center transition-all bg-slate-800 border-slate-600 hover:border-orange-500 hover:bg-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-500/25 transition-colors">
              {loading === "company" ? (
                <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              ) : (
                <HardHat className="w-6 h-6 text-orange-400" />
              )}
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Find work</h3>
            <p className="text-xs text-slate-400 leading-snug">I&apos;m a tradesperson or business</p>
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-slate-600">
          You can always change this later in your account settings.
        </p>
      </div>
    </div>
  )
}
