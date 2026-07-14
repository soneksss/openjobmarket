"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Rocket, Zap, Check, Crown, Building2, MapPin, MessageCircle, Briefcase,
  Bell, TrendingUp, Info, ChevronDown,
} from "lucide-react"

interface MembershipPlan {
  id: string
  key: string
  name: string
  price_pence: number
}

const PLAN_FEATURES: Record<string, { icon: typeof Building2; text: string }[]> = {
  passive: [
    { icon: Building2, text: "Business profile" },
    { icon: MapPin, text: "Grey map icon" },
    { icon: Briefcase, text: "Browse local jobs" },
    { icon: MessageCircle, text: "Message homeowners" },
    { icon: Check, text: "Apply for jobs" },
  ],
  active: [
    { icon: Zap, text: "Available Now toggle" },
    { icon: MapPin, text: "Green highlighted map icon" },
    { icon: Bell, text: "Priority notifications" },
    { icon: TrendingUp, text: "Increased visibility" },
  ],
}

const FAQS = [
  {
    q: "When will memberships begin?",
    a: "Only once Open Job Market is established and delivering regular work in your local area.",
  },
  {
    q: "Will I receive advance notice?",
    a: "Yes. Existing members will receive plenty of notice before memberships begin.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There will be no long-term contracts.",
  },
  {
    q: "Why is the platform currently free?",
    a: "Because our priority is building a strong local marketplace before introducing memberships.",
  },
]

function formatAroundPrice(pricePence: number) {
  const pounds = pricePence / 100
  return `Around £${pounds % 1 === 0 ? pounds.toFixed(0) : pounds.toFixed(2)}/month`
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3.5">
          <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])

  useEffect(() => {
    fetch("/api/membership-plans")
      .then(r => (r.ok ? r.json() : { plans: [] }))
      .then(d => setPlans(d.plans ?? []))
      .catch(() => {})
  }, [])

  const passive = plans.find(p => p.key === "passive")
  const active = plans.find(p => p.key === "active")

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', paddingBottom: 80 }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-10 pb-8 sm:pt-14 sm:pb-10 max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
          <Crown className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight mb-3">
          Membership
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
          The platform is genuinely free right now. Here&apos;s exactly what to expect — what it costs today,
          what it&apos;s expected to cost later, and how much notice you&apos;ll get before anything changes.
        </p>
      </section>

      {/* ── Launch Mode ──────────────────────────────────────────────────── */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-950/30 shadow-lg p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 mb-4">
                <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 text-sm font-bold tracking-wide uppercase">Launch Mode</span>
              </div>
              <p className="text-white font-semibold text-base sm:text-lg leading-relaxed mb-4">
                Open Job Market is currently free while we build a strong local marketplace.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Full Active Membership is included",
                  "No subscription is required",
                  "No payment details are needed",
                  "Existing members will receive plenty of notice before memberships begin",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Future Membership Plans ──────────────────────────────────────── */}
      <section className="px-4 pb-8 border-t border-slate-800/60 pt-10">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Expected Membership Pricing</h2>
          </div>
          <p className="text-slate-400 text-sm text-center max-w-xl mx-auto mb-8">
            These prices are our current planned memberships once Open Job Market is established and delivering
            regular work.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Passive */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
              <span className="w-3 h-3 rounded-full bg-slate-400 inline-block mb-3" />
              <h3 className="font-bold text-white text-lg mb-1">Passive Membership</h3>
              <p className="text-2xl font-bold text-white mb-1">
                {passive ? formatAroundPrice(passive.price_pence) : "Around £10/month"}
              </p>
              <p className="text-xs text-slate-500 mb-5">
                Suitable for established tradespeople who simply want local visibility.
              </p>
              <div className="space-y-2.5">
                {PLAN_FEATURES.passive.map(f => (
                  <div key={f.text} className="flex items-center gap-2.5">
                    <f.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active — Recommended */}
            <div className="relative rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-6">
              <span className="absolute -top-2.5 left-6 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">
                Recommended
              </span>
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block mb-3" />
              <h3 className="font-bold text-white text-lg mb-1">Active Membership</h3>
              <p className="text-2xl font-bold text-white mb-1">
                {active ? formatAroundPrice(active.price_pence) : "Around £20/month"}
              </p>
              <p className="text-xs text-emerald-300/80 mb-5">
                Everything in Passive, plus — ideal for tradespeople looking for immediate work.
              </p>
              <div className="space-y-2.5">
                {PLAN_FEATURES.active.map(f => (
                  <div key={f.text} className="flex items-center gap-2.5">
                    <f.icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-slate-200">{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Important notice */}
          <div className="flex items-start gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 mt-6">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              These are our current planned membership prices. Final pricing may change slightly as the platform
              grows, but all existing members will receive plenty of advance notice before memberships become
              chargeable.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-8 border-t border-slate-800/60 pt-10">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-lg text-center">
          <Link href="/auth/sign-up?accountType=company&source=quickcheck"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25">
            <Zap className="w-4 h-4 fill-white" />
            Join Free Today
          </Link>
        </div>
      </section>

    </div>
  )
}
