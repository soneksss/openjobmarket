"use client"

// Tradespeople | Trade Jobs | Vacancies switcher shown at the top of each map.
// Keeps the current map centre when switching so the new map opens on the same area.

import { useRouter } from "next/navigation"
import { Briefcase, Building2, Users } from "lucide-react"

type Tab = "trades" | "jobs" | "vacancies"

const TABS: { id: Tab; label: string; href: string; icon: typeof Users; active: string }[] = [
  { id: "trades",    label: "Tradespeople", href: "/find",           icon: Users,     active: "bg-emerald-500" },
  { id: "jobs",      label: "Trade Jobs",   href: "/find-jobs",      icon: Briefcase, active: "bg-orange-500" },
  { id: "vacancies", label: "Vacancies",    href: "/find-vacancies", icon: Building2, active: "bg-sky-500" },
]

export function MapTabs({ active, coords }: { active: Tab; coords: [number, number] }) {
  const router = useRouter()
  return (
    <div className="flex self-center w-full max-w-[360px] lg:w-[360px] bg-slate-800/95 border border-slate-700/80 rounded-full p-0.5 shadow-lg backdrop-blur-sm">
      {TABS.map(t => {
        const Icon = t.icon
        const on = t.id === active
        return (
          <button key={t.id}
            onClick={on ? undefined : () => router.push(`${t.href}?lat=${coords[0]}&lng=${coords[1]}`)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-colors ${on ? `${t.active} text-white shadow-sm` : "text-slate-400 hover:text-white"}`}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
