"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle, Zap, Search, Send, MapPin, ArrowRight, Loader2, X, Check, Rocket,
  Smartphone, Users, Copy, Share2, Clock,
} from "lucide-react"

interface MembershipPlan {
  id: string
  key: string
  name: string
  price_pence: number
}

function formatAroundPrice(pricePence: number) {
  const pounds = pricePence / 100
  return `Around £${pounds % 1 === 0 ? pounds.toFixed(0) : pounds.toFixed(2)}/month`
}

const COMPARISON_ROWS = [
  { them: "Pay for every lead",                    us: "No lead fees" },
  { them: "Expensive yearly listings",              us: "Free during Launch Mode" },
  { them: "Compete with dozens of tradespeople",    us: "Local opportunities only" },
  { them: "Customers receive unwanted calls",       us: "Direct messaging only" },
  { them: "Commission on completed work",           us: "Keep 100% of what you earn" },
  { them: "Little control",                         us: "You choose which jobs interest you" },
] as const

const CONTROL_POINTS = [
  "Choose only the jobs that interest you",
  "Visit before providing a quotation",
  "Request deposits where appropriate",
  "Arrange dates directly with homeowners",
  "Accept or decline any opportunity",
  "No obligation to take any job",
] as const

const BENEFITS = [
  { headline: "Keep 100% of your earnings", sub: "Zero commission on every job you win" },
  { headline: "No lead fees",               sub: "Browse and message for free" },
  { headline: "Direct messaging",           sub: "Chat with homeowners — no agency in between" },
  { headline: "Build your reputation",      sub: "Collect reviews and grow your local presence" },
  { headline: "Available Now toggle",       sub: "Instant alerts, and go available for urgent work in one tap" },
  { headline: "Work when it suits you",     sub: "Switch availability on or off any time" },
] as const

const HOW_STEPS = [
  {
    step: 1,
    label: "Receive Local Job Opportunities",
    sub: "Jobs reach you through notifications, browsing, the map, or urgent alerts.",
    mockup: (
      <div style={{ background: '#020617', borderRadius: 12, border: '1px solid #1e293b', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>9:41</span>
          <span style={{ fontSize: 8, color: '#f97316', fontWeight: 700 }}>● LIVE</span>
        </div>
        <div style={{ background: 'linear-gradient(90deg,#f97316,#ea580c)', borderRadius: 8, padding: '6px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#fff' }}>⚡</span>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>New job posted nearby</p>
              <p style={{ fontSize: 8, color: '#fed7aa', margin: 0, lineHeight: 1.2 }}>0.8 mi · Posted just now</p>
            </div>
          </div>
        </div>
        {[{ t: "Boiler repair", d: "1.2 mi", e: "£80–120" }, { t: "Leak fix", d: "2.1 mi", e: "£60–90" }].map(j => (
          <div key={j.t} style={{ background: '#1e293b', borderRadius: 8, padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#fff', margin: 0 }}>{j.t}</p>
              <p style={{ fontSize: 8, color: '#94a3b8', margin: 0 }}>{j.d}</p>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399' }}>{j.e}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: 2,
    label: "Message the Homeowner",
    sub: "Ask questions, discuss the work and arrange a convenient visit. No commitment. No bidding wars.",
    mockup: (
      <div style={{ background: '#020617', borderRadius: 12, border: '1px solid #1e293b', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>9:45</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
            <span style={{ fontSize: 7, color: '#34d399' }}>Online</span>
          </div>
        </div>
        <div style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 7, color: '#93c5fd', fontWeight: 700 }}>J</span>
          </div>
          <p style={{ fontSize: 9, fontWeight: 600, color: '#fff', margin: 0 }}>James (Homeowner)</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ background: '#334155', borderRadius: '8px 8px 8px 0', padding: '4px 8px', maxWidth: '85%' }}>
            <p style={{ fontSize: 8, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>Could you take a look this week?</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#f97316', borderRadius: '8px 8px 0 8px', padding: '4px 8px', maxWidth: '85%' }}>
            <p style={{ fontSize: 8, color: '#fff', margin: 0, lineHeight: 1.3 }}>Happy to pop by Thursday to take a look ✓</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1e293b', borderRadius: 20, padding: '4px 8px' }}>
          <div style={{ flex: 1, height: 4, background: '#334155', borderRadius: 2 }} />
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send style={{ width: 8, height: 8, color: '#fff' }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    label: "Visit & Quote",
    sub: "Inspect the job if needed. Provide your quotation only after understanding the work. Request a deposit when appropriate. You remain fully in control.",
    mockup: (
      <div style={{ background: '#020617', borderRadius: 12, border: '1px solid #1e293b', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>9:41</span>
          <MapPin style={{ width: 10, height: 10, color: '#475569' }} />
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '6px 8px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0 }}>🔧 Boiler repair — visited</p>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '2px 0 0' }}>Inspected on site · Ready to quote</p>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>Your quotation</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399' }}>£95</span>
        </div>
        <div style={{ background: '#f97316', borderRadius: 8, padding: '6px 0', textAlign: 'center', boxShadow: '0 0 12px rgba(249,115,22,0.4)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Send Quotation</span>
        </div>
        <p style={{ fontSize: 8, color: '#64748b', textAlign: 'center', margin: 0 }}>You choose the price. No bidding.</p>
      </div>
    ),
  },
  {
    step: 4,
    label: "Complete the Job",
    sub: "Complete the work. Receive payment directly from the homeowner. Keep 100% of what you earn.",
    mockup: (
      <div style={{ background: '#020617', borderRadius: 12, border: '1px solid #1e293b', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>9:41</span>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check style={{ width: 12, height: 12, color: '#fff' }} />
          </div>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0 }}>Job Complete</p>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>Paid directly by homeowner</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399' }}>£95</span>
        </div>
        <p style={{ fontSize: 8, color: '#64748b', textAlign: 'center', margin: 0 }}>You keep 100% — zero commission.</p>
      </div>
    ),
  },
] as const

export default function ForTradespeoplePageWrapper() {
  const router = useRouter()
  const [locating, setLocating] = useState(false)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralEnabled, setReferralEnabled] = useState(true)
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/membership-plans")
      .then(r => (r.ok ? r.json() : { plans: [] }))
      .then(d => setPlans(d.plans ?? []))
      .catch(() => {})

    fetch("/api/referral-config")
      .then(r => (r.ok ? r.json() : { enabled: true }))
      .then(d => setReferralEnabled(d.enabled ?? true))
      .catch(() => {})

    fetch("/api/tradesperson/membership-status")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.referral_code) setReferralCode(d.referral_code) })
      .catch(() => {})
      .finally(() => setCheckedAuth(true))
  }, [])

  const passivePlan = plans.find(p => p.key === "passive")
  const activePlan = plans.find(p => p.key === "active")

  const referralLink = referralCode && typeof window !== "undefined"
    ? `${window.location.origin}/auth/sign-up?accountType=company&source=quickcheck&ref=${referralCode}`
    : ""

  const copyReferralLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const shareReferralLink = () => {
    if (!referralLink) return
    if (navigator.share) {
      navigator.share({ title: "Join Open Job Market", text: "Find local trade work — join me on Open Job Market.", url: referralLink }).catch(() => {})
    } else {
      copyReferralLink()
    }
  }

  const handleBrowseJobs = () => {
    if (!navigator.geolocation) {
      router.push("/find-jobs")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        router.push(`/find-jobs?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
      },
      () => {
        router.push("/find-jobs")
      },
      { timeout: 8000 }
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', paddingBottom: 80 }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-10 pb-8 sm:pt-14 sm:pb-10 max-w-2xl mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/70 mb-2">
          For Tradespeople
        </p>
        <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight mb-4">
          Find Local Work Without Paying for Leads
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-7 max-w-xl mx-auto">
          Connect directly with nearby homeowners. No lead fees, no commission and no middlemen. Choose which jobs
          interest you, arrange a visit, and provide your quotation when you&apos;re ready.
        </p>

        {/* CTAs */}
        <div className="flex flex-row gap-2 justify-center">
          <Link href="/auth/sign-up"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25">
            <Zap className="w-4 h-4 fill-white flex-shrink-0" />
            Join Free Today
          </Link>
          <button
            onClick={handleBrowseJobs}
            disabled={locating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-600 hover:border-slate-400 active:scale-[0.97] text-slate-200 hover:text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {locating
              ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              : <Search className="w-4 h-4 flex-shrink-0" />}
            {locating ? "Finding your location…" : "Browse Jobs"}
          </button>
        </div>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <section className="py-10 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-3">
            Why Tradespeople Choose{" "}
            <span className="text-orange-400 whitespace-nowrap">Open Job Market</span>
          </h2>
          <p className="text-slate-400 text-sm text-center max-w-lg mx-auto mb-6 leading-relaxed">
            A local marketplace built around membership instead of paying for every lead — no bidding wars, no
            middlemen, no unwanted sales calls.
          </p>
          <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-bold text-slate-400 bg-slate-800/60">Traditional Lead Platforms</th>
                  <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-bold text-orange-400 bg-orange-950/20">Open Job Market</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.them} className={i > 0 ? "border-t border-slate-800/60" : ""}>
                    <td className="px-3 sm:px-4 py-2.5 bg-slate-800/30">
                      <span className="flex items-start gap-1.5 text-slate-400 text-xs sm:text-sm leading-snug">
                        <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        {row.them}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 bg-orange-950/10">
                      <span className="flex items-start gap-1.5 text-slate-100 font-medium text-xs sm:text-sm leading-snug">
                        <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                        {row.us}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Launch Mode pricing ──────────────────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-slate-800 via-slate-800 to-orange-950/30 shadow-lg p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="relative">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-1 mb-3">
                  <Rocket className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-300 text-sm font-bold tracking-wide uppercase">🚀 Launch Mode</span>
                </div>
                <p className="text-3xl font-bold text-white leading-tight mb-2">FREE</p>
                <ul className="space-y-1.5">
                  {[
                    "Full Active Membership included",
                    "No payment details required",
                    "No subscription during Launch Mode",
                    "Existing members will receive plenty of advance notice before memberships begin",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2 text-slate-300 text-sm leading-snug">
                      <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Planned memberships */}
              <div className="pt-5 border-t border-slate-700/50">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Planned Memberships</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl bg-slate-900/50 border border-slate-700/50 p-3 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Passive Membership</p>
                    <p className="text-sm sm:text-base font-bold text-white leading-tight break-words">{passivePlan ? formatAroundPrice(passivePlan.price_pence) : "Around £10/month"}</p>
                  </div>
                  <div className="rounded-xl bg-orange-950/20 border border-orange-500/30 p-3 min-w-0">
                    <p className="text-xs text-orange-300/80 mb-0.5">Active Membership</p>
                    <p className="text-sm sm:text-base font-bold text-white leading-tight break-words">{activePlan ? formatAroundPrice(activePlan.price_pence) : "Around £20/month"}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Our goal is to keep memberships affordable and predictable. Existing members will always receive
                  plenty of advance notice before memberships begin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Perfect For ──────────────────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-lg font-bold text-white mb-4">Perfect For</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Sole traders",
              "Self-employed tradespeople",
              "Small local businesses",
              "Growing trade companies looking for more local work",
            ].map(item => (
              <span key={item} className="text-xs sm:text-sm text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-full px-3.5 py-1.5">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-10 border-t border-slate-800/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/70 mb-1">How you actually win work</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-3">
            {HOW_STEPS.map(item => (
              <div key={item.step} className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{item.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.sub}</p>
                  </div>
                </div>
                {item.mockup}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── You Stay in Control ─────────────────────────────────────────── */}
      <section className="py-10 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">You Stay in Control</h2>
          <p className="text-slate-400 text-sm text-center mb-6">
            Nothing here commits you to work you haven&apos;t seen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTROL_POINTS.map(point => (
              <div key={point} className="flex items-start gap-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3.5">
                <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-200 text-sm leading-snug">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">What You Gain</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map(item => (
              <div key={item.headline} className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <ArrowRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{item.headline}</p>
                  <p className="text-slate-400 text-xs mt-1">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile App ───────────────────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-lg">
          <h2 className="text-xl font-bold text-white text-center mb-6">Get the Mobile App</h2>
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/25 bg-slate-800/70 backdrop-blur-sm p-6 sm:p-8 shadow-2xl shadow-orange-900/10">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-orange-500/6 blur-2xl scale-105" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <p className="text-slate-300 text-sm leading-relaxed">
                  Download the Open Job Market app to receive:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {[
                  "Instant push notifications",
                  "Nearby job alerts",
                  "Faster messaging",
                  "Better mobile experience",
                  "One-tap Available Now toggle",
                ].map(item => (
                  <div key={item} className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-xs leading-snug">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white rounded-2xl p-3 flex-shrink-0">
                  <img src="/qr-code.jpg" alt="Scan to download Open Job Market app"
                    className="w-24 h-24 object-contain rounded-lg" />
                </div>
                <a href="https://play.google.com/store/apps/details?id=com.openjobmarket.app"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-black hover:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-2.5 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0">
                    <defs>
                      <linearGradient id="gp-g2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%"   stopColor="#00d4ff" />
                        <stop offset="33%"  stopColor="#00e676" />
                        <stop offset="66%"  stopColor="#ffeb3b" />
                        <stop offset="100%" stopColor="#ff5252" />
                      </linearGradient>
                    </defs>
                    <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"
                      fill="url(#gp-g2)" />
                  </svg>
                  <div>
                    <p className="text-slate-400 text-[10px] leading-none mb-0.5 uppercase tracking-wider">GET IT ON</p>
                    <p className="text-white font-bold text-sm leading-none">Google Play</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Referral ─────────────────────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-lg">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <h2 className="text-lg font-bold text-white">Grow Your Network</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Help grow your local trade community. Share your referral link with another tradesperson.
              {referralEnabled
                ? " When the referral programme is active, both of you can receive membership rewards."
                : ""}
            </p>

            {!referralEnabled ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-slate-900/50 border border-slate-700/40 p-3.5">
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Referral rewards are coming soon. Your link will still work — rewards will apply retroactively
                  once the programme is switched on.
                </p>
              </div>
            ) : referralCode ? (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center px-3 py-2.5 rounded-xl bg-slate-900/50 border border-slate-700/50 text-slate-300 text-xs sm:text-sm truncate">
                  {referralLink}
                </div>
                <button onClick={copyReferralLink}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-sm font-medium transition-colors flex-shrink-0">
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : ""}
                </button>
                <button onClick={shareReferralLink}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors flex-shrink-0">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            ) : checkedAuth ? (
              <Link href="/auth/sign-up"
                className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold text-sm transition-colors">
                Sign up to get your referral link
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="h-10 rounded-xl bg-slate-900/40 animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {/* ── Why Homeowners Love It ───────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-lg font-bold text-white text-center mb-1">Why Homeowners Love Open Job Market</h2>
          <p className="text-slate-400 text-sm text-center mb-5">
            Homeowners have their own strong reasons to use the platform — which means real demand for your work.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "See who's available now",
              "Contact tradespeople directly",
              "Receive multiple quotations",
              "Find trusted local professionals",
              "Avoid lead-selling and spam calls",
            ].map(item => (
              <span key={item} className="text-xs sm:text-sm text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-full px-3.5 py-1.5">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-lg text-center">
          <p className="text-2xl font-bold text-white mb-2">Ready to find more work?</p>
          <p className="text-slate-400 text-sm mb-6">Join local tradespeople already using Open Job Market.</p>
          <Link href="/auth/sign-up"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-orange-500/25">
            <Zap className="w-4 h-4 fill-white" />
            Create Free Account
          </Link>
        </div>
      </section>

    </div>
  )
}
