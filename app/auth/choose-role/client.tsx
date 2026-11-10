"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Home, Search, HardHat, Building2, Loader2 } from "lucide-react"
import { POST_VACANCY_PATH } from "@/components/post-vacancy-card"

type Role = "homeowner" | "company"

// Four plain choices, so a business that wants to hire staff doesn't have to
// guess between "post a job" and "find work". Each maps to the same two
// account types as sign-up (individual / business); `next` overrides the
// dashboard the server sends them to.
const CHOICES: { key: string; role: Role; title: string; desc: string; icon: typeof Home; next?: string; accent: string }[] = [
  { key: "hire",      role: "homeowner", title: "Hire a tradesperson", desc: "Get work done at my home or property", icon: Home,      accent: "blue" },
  { key: "jobseeker", role: "homeowner", title: "Find a job",          desc: "Browse and apply for vacancies",       icon: Search,    accent: "blue", next: "/find-vacancies" },
  { key: "trade",     role: "company",   title: "Find trade work",     desc: "I'm a tradesperson or trade business", icon: HardHat,   accent: "orange" },
  { key: "employer",  role: "company",   title: "Hire staff",          desc: "Post vacancies for my business",       icon: Building2, accent: "orange", next: POST_VACANCY_PATH },
]

const ACCENT: Record<string, { card: string; icon: string; text: string }> = {
  blue:   { card: "hover:border-blue-500 hover:bg-blue-500/10 focus:ring-blue-500/50",       icon: "bg-blue-500/15 group-hover:bg-blue-500/25",     text: "text-blue-400" },
  orange: { card: "hover:border-orange-500 hover:bg-orange-500/10 focus:ring-orange-500/50", icon: "bg-orange-500/15 group-hover:bg-orange-500/25", text: "text-orange-400" },
}

export default function ChooseRoleClient() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const choose = async (choice: (typeof CHOICES)[number]) => {
    setLoading(choice.key)
    setError(null)
    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: choice.role }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || "Something went wrong. Please try again.")
      router.replace(choice.next ?? body.dashboardUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setLoading(null)
    }
  }

  const group = (label: string, role: Role) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {CHOICES.filter(c => c.role === role).map((c) => {
          const Icon = c.icon
          const a = ACCENT[c.accent]
          return (
            <button
              key={c.key}
              onClick={() => choose(c)}
              disabled={loading !== null}
              className={`group p-4 border-2 rounded-2xl text-center transition-all bg-slate-800 border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${a.card}`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2.5 transition-colors ${a.icon}`}>
                {loading === c.key ? (
                  <Loader2 className={`w-5 h-5 animate-spin ${a.text}`} />
                ) : (
                  <Icon className={`w-5 h-5 ${a.text}`} />
                )}
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">{c.title}</h3>
              <p className="text-xs text-slate-400 leading-snug">{c.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">One last step</h1>
          <p className="text-slate-400 text-sm">What would you like to do on Open Job Market?</p>
        </div>

        <div className="space-y-5">
          {group("For myself", "homeowner")}
          {group("For my business", "company")}
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
