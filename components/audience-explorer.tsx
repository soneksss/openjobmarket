"use client"

// "Who is it for?" on the marketing page: four cards (homeowners, tradespeople,
// businesses, jobseekers). Picking one fades in a light panel with that
// group's benefits and the two actions that matter to them.

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight, Bell, Briefcase, Building2, Check, ClipboardList, FileText, Hammer, Home,
  Map as MapIcon, MapPin, MessagesSquare, Search, ToggleRight, UserPlus, Zap,
} from "lucide-react"

type AudienceId = "homeowners" | "tradespeople" | "businesses" | "jobseekers"
type Action = { label: string; href?: string; onClick?: () => void }

const TONES = {
  emerald: { icon: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-400", dot: "bg-emerald-500" },
  orange:  { icon: "bg-orange-100 text-orange-700",   ring: "ring-orange-400",  dot: "bg-orange-500" },
  violet:  { icon: "bg-violet-100 text-violet-700",   ring: "ring-violet-400",  dot: "bg-violet-500" },
  sky:     { icon: "bg-sky-100 text-sky-700",         ring: "ring-sky-400",     dot: "bg-sky-500" },
}

const EMPLOYER_SIGNUP = `/auth/sign-up?source=welcome&accountType=company&returnUrl=${encodeURIComponent("/jobs/vacancy/new")}`
const HOMEOWNER_SIGNUP = `/auth/sign-up?source=quickcheck&accountType=individual&returnUrl=${encodeURIComponent("/find-trades")}`
const JOBSEEKER_SIGNUP =`/auth/sign-up?source=quickcheck&accountType=individual&returnUrl=${encodeURIComponent("/find-vacancies")}`

export function AudienceExplorer({ isSignedIn, userType, onPostJob }: {
  isSignedIn: boolean
  userType?: string | null
  onPostJob: () => void
}) {
  const [active, setActive] = useState<AudienceId>("homeowners")
  const isBusiness = userType === "company"

  const AUDIENCES: {
    id: AudienceId; label: string; short: string; icon: typeof Home; tone: keyof typeof TONES
    title: string; intro: string
    benefits: { icon: typeof Home; title: string; text: string }[]
    map: Action          // every group gets a way straight onto its map
    register: Action     // and a sign-up (or, once signed in, their next step)
    extra?: Action
  }[] = [
    {
      id: "homeowners", label: "Homeowners", short: "Get jobs done", icon: Home, tone: "emerald",
      title: "Find a trusted local tradesperson", intro: "See who's nearby and available, then talk to them directly.",
      benefits: [
        { icon: MapPin, title: "See who's available now", text: "Green vans on the live map are tradespeople free to work." },
        { icon: MessagesSquare, title: "Message trades directly", text: "No middleman and no unwanted sales calls." },
        { icon: Zap, title: "Urgent help", text: "Alert nearby available trades and get a fast reply." },
        { icon: ClipboardList, title: "Compare quotes", text: "Post once and hear back from local trades. Free." },
      ],
      map: { label: "Open the tradespeople map", href: "/find-trades" },
      register: isSignedIn ? { label: "Post a job", onClick: onPostJob } : { label: "Create a free account", href: HOMEOWNER_SIGNUP },
      extra: isSignedIn ? undefined : { label: "Post a job", onClick: onPostJob },
    },
    {
      id: "tradespeople", label: "Tradespeople", short: "Win local work", icon: Hammer, tone: "orange",
      title: "More local customers, no lead fees", intro: "Put your business on the map and hear about jobs near you.",
      benefits: [
        { icon: MapPin, title: "Get found locally", text: "Homeowners near you see your business on the map." },
        { icon: Bell, title: "New job alerts", text: "Get told about jobs in your trades and area." },
        { icon: Check, title: "No pay-per-lead", text: "No subscription and no fees to reply to a job." },
        { icon: ToggleRight, title: "You're in control", text: "Show when you're available, or that you're busy." },
      ],
      map: { label: "Open the trade jobs map", href: "/find-jobs" },
      register: isSignedIn
        ? { label: "Go to my dashboard", href: "/dashboard" }
        : { label: "Create my free business profile", href: "/auth/sign-up?source=welcome&accountType=company" },
    },
    {
      id: "businesses", label: "Businesses", short: "Hire staff", icon: UserPlus, tone: "violet",
      title: "Find staff locally, free", intro: "Post a vacancy and hear straight from people nearby.",
      benefits: [
        { icon: Briefcase, title: "Post vacancies free", text: "No posting fees and no recruiter in between." },
        { icon: MapPin, title: "Reach people nearby", text: "Your vacancy appears on the map where locals look for work." },
        { icon: FileText, title: "Messages with CVs", text: "Applicants message you and can attach their CV." },
        { icon: MessagesSquare, title: "One inbox", text: "Every application lands in your Messages." },
      ],
      map: { label: "Open the vacancies map", href: "/find-vacancies" },
      register: isSignedIn && isBusiness
        ? { label: "Post a vacancy", href: "/jobs/vacancy/new" }
        : { label: "Sign up free and post a vacancy", href: EMPLOYER_SIGNUP },
    },
    {
      id: "jobseekers", label: "Jobseekers", short: "Find a job", icon: Search, tone: "sky",
      title: "Find a job close to home", intro: "Browse vacancies from local businesses on the map.",
      benefits: [
        { icon: Building2, title: "Local vacancies", text: "Jobs with businesses near you, shown on a map." },
        { icon: FileText, title: "Apply in minutes", text: "Send a short message and attach your CV." },
        { icon: Check, title: "No long profile", text: "A quick free account is all you need." },
        { icon: MessagesSquare, title: "Talk to the employer", text: "Replies come straight to your messages." },
      ],
      map: { label: "Open the vacancies map", href: "/find-vacancies" },
      register: isSignedIn ? { label: "My messages", href: "/messages" } : { label: "Create a free account", href: JOBSEEKER_SIGNUP },
    },
  ]

  const a = AUDIENCES.find(x => x.id === active)!
  const tone = TONES[a.tone]

  const button = (act: Action, kind: "map" | "register" | "extra") => {
    const cls = {
      map:      "inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30",
      register: "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 py-3.5 text-base font-bold text-white",
      extra:    "inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 px-6 py-3 text-base font-semibold text-slate-700",
    }[kind]
    const inner = <>{kind === "map" && <MapIcon className="h-5 w-5" />}{act.label}{kind === "register" && <ArrowRight className="h-5 w-5" />}</>
    return act.href
      ? <Link key={kind} href={act.href} prefetch={false} className={cls}>{inner}</Link>
      : <button key={kind} onClick={act.onClick} className={cls}>{inner}</button>
  }

  return (
    <div className="mt-10 sm:mt-14">
      <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-emerald-300/90 md:text-left">Who is it for?</p>

      <div role="tablist" aria-label="Who is it for?" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {AUDIENCES.map(x => {
          const on = x.id === active
          const t = TONES[x.tone]
          return (
            <button key={x.id} role="tab" aria-selected={on} aria-controls="audience-panel" onClick={() => setActive(x.id)}
              className={`group flex items-center gap-3 rounded-2xl bg-white p-3.5 sm:p-4 text-left transition-all duration-300 ${on
                ? `ring-4 ${t.ring} shadow-xl shadow-black/30 -translate-y-0.5`
                : "opacity-90 hover:opacity-100 hover:-translate-y-0.5 hover:shadow-lg"}`}>
              <span className={`flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-2xl ${t.icon}`}>
                <x.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-base sm:text-lg font-bold text-slate-900 leading-tight">{x.label}</span>
                <span className="block text-xs sm:text-sm text-slate-500">{x.short}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* key → remounts on change so the panel fades in again for each group */}
      <div key={a.id} id="audience-panel" role="tabpanel"
        className="ojm-panel-in mt-4 rounded-3xl bg-white p-5 text-slate-900 shadow-2xl shadow-black/40 sm:p-8">
        <div className="flex items-start gap-3">
          <span className={`hidden sm:flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
            <a.icon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{a.title}</h2>
            <p className="mt-1 text-base text-slate-600 sm:text-lg">{a.intro}</p>
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {a.benefits.map((b, i) => (
            <li key={b.title} className="ojm-panel-in flex items-start gap-3 rounded-2xl bg-slate-50 p-4"
              style={{ animationDelay: `${80 + i * 70}ms` }}>
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
                <b.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-base font-bold text-slate-900">{b.title}</span>
                <span className="block text-sm text-slate-600">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {button(a.map, "map")}
          {button(a.register, "register")}
          {a.extra && button(a.extra, "extra")}
        </div>
        <p className="mt-4 text-sm font-medium text-emerald-700">Free to use · No lead fees · No middleman</p>
      </div>
    </div>
  )
}
