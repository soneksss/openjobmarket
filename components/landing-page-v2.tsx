"use client"

import React, { useState, useRef, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle, ChevronLeft, ChevronRight,
  Smartphone, Users, Briefcase, X,
} from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { helpItems } from "@/lib/data/help-items"

const JobWizardModal = dynamic(() => import("@/components/job-wizard-modal"), { ssr: false })

interface Props {
  isSignedIn: boolean
  user?: any
  userType?: string | null
  [key: string]: any
}

const TRUST_ITEMS = [
  { headline: "Verified local trades", sub: "Every trade is vetted" },
  { headline: "Direct contact",        sub: "No middleman. No spam calls." },
  { headline: "No lead selling",       sub: "Fairer prices for everyone" },
  { headline: "Real reviews",          sub: "See previous work" },
  { headline: "Fast replies",          sub: "Most trades reply same day" },
  { headline: "Free to post jobs",     sub: "No subscription needed" },
] as const

const OTHERS_CONS = [
  "Sell your request as paid leads",
  "Multiple unwanted sales calls",
  "Often matched with non-local companies",
  "Slow quote process",
  "You don't know who's actually available",
]
const OJM_PROS = [
  "No lead selling — fairer prices",
  "Connect directly with nearby tradespeople",
  "Message only — no spam calls",
  "Uber-style for urgent jobs, Airbnb-style for flexible work",
  "See who's available before making contact",
]

const HOW_OPTIONS = [
  {
    id: "direct",
    emoji: "🗺️",
    title: "Find & Contact Directly",
    intro: "Open the live map and view trusted local tradespeople near you.",
    points: [
      "View profiles and reviews",
      "See previous work",
      "Contact tradespeople directly",
      "Perfect when you've found someone you like",
    ],
    footer: null,
  },
  {
    id: "urgent",
    emoji: "⚡",
    title: "Post an Urgent Job",
    intro: "Need help today? Post an urgent job.",
    points: [
      "Stays active for up to 1 hour",
      "Automatically notifies up to 3 nearby available tradespeople",
      "They message you with availability and pricing",
    ],
    footer: "Ideal for: plumbing leaks, power failures, blocked drains, emergency repairs.",
  },
  {
    id: "flexible",
    emoji: "📋",
    title: "Post a Flexible Job",
    intro: "Planning work? Post your job for up to 7 days.",
    points: [
      "Up to 10 local tradespeople can express interest",
      "They message you, arrange a visit and provide a quotation",
      "Compare options before you hire",
    ],
    footer: "Ideal for: kitchens, bathrooms, roofing, decorating, larger projects.",
  },
] as const

const DECISION_HELPER = [
  { need: "Someone you've already found on the map", emoji: "🗺️", option: "Find & Contact Directly" },
  { need: "Help today",                               emoji: "⚡", option: "Post an Urgent Job" },
  { need: "Multiple quotations",                      emoji: "📋", option: "Post a Flexible Job" },
] as const

export function LandingPageV2({ isSignedIn, user, userType }: Props) {
  const router = useRouter()

  // ── Category scroll ──────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPos = useRef(0)
  const dragRef   = useRef({ dragging: false, startX: 0, startScroll: 0 })

  const scrollCategories = (dir: "left" | "right") => {
    const el = scrollRef.current; if (!el) return
    const step = el.clientWidth
    scrollPos.current = Math.max(0, Math.min(
      scrollPos.current + (dir === "right" ? step : -step),
      el.scrollWidth - el.clientWidth
    ))
    el.scrollTo({ left: scrollPos.current, behavior: "smooth" })
  }
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current; if (!el) return
    dragRef.current = { dragging: true, startX: e.clientX, startScroll: el.scrollLeft }
    el.style.cursor = "grabbing"; el.style.userSelect = "none"
  }
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return
    const el = scrollRef.current; if (!el) return
    el.scrollLeft = dragRef.current.startScroll - (e.clientX - dragRef.current.startX)
    scrollPos.current = el.scrollLeft
  }
  const onMouseUp = () => {
    dragRef.current.dragging = false
    const el = scrollRef.current
    if (el) { el.style.cursor = "grab"; el.style.userSelect = "" }
  }

  // ── Job wizard ───────────────────────────────────────────────────────────
  const [showWizard,    setShowWizard]    = useState(false)
  const [wizardIndustry, setWizardIndustry] = useState<string | undefined>()
  const [wizardService,  setWizardService]  = useState<string | undefined>()
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const handleCategory = (industry: string, service?: string) => {
    if (userType === "company") return
    setWizardIndustry(industry); setWizardService(service); setShowWizard(true)
  }

  // Same full-screen photo category picker as the "Get Multiple Quotes" button
  // on /find-trades — pick a trade first, then the job wizard opens pre-filled.
  const handlePostJob = () => {
    if (userType === "company") { router.push("/find-trades"); return }
    setShowCategoryPicker(true)
  }

  const pickPostJobCategory = (industry: string, service?: string) => {
    setWizardIndustry(industry)
    setWizardService(service)
    setShowCategoryPicker(false)
    setShowWizard(true)
  }

  const scrollToHowItWorks = () => {
    document.getElementById("sec-how")?.scrollIntoView({ behavior: "smooth" })
  }

  // ── Scroll-triggered fade-in ─────────────────────────────────────────────
  const [visible, setVisible] = useState<Set<string>>(new Set())
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting && e.target.id)
          setVisible(prev => new Set([...prev, e.target.id]))
      }),
      { threshold: 0.08 }
    )
    document.querySelectorAll("[data-fade]").forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const fade = (id: string) =>
    `transition-all duration-700 ease-out ${visible.has(id) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`

  return (
    <div
      className="relative min-h-screen pb-20 md:pb-0 bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{
        // A CSS background is always painted behind its own element's content —
        // no z-index or stacking-context games needed (unlike the separate
        // absolute/fixed divs tried earlier, which kept getting compared against
        // ancestors like HomePageWrapper or even the global Header). The gradient
        // + image are layered natively via CSS's multi-background syntax (first
        // listed paints on top); bg-fixed keeps the pinned-while-scrolling look.
        backgroundImage:
          "linear-gradient(to bottom, rgba(15,23,42,0.92), rgba(15,23,42,0.88), rgba(15,23,42,0.95)), url('/wallpaper.jpg')",
      }}
    >

      {/* ── Trust Strip ──────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.82)' }}>
        {/* Mobile: 2-col grid */}
        <div className="sm:hidden px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {TRUST_ITEMS.map(item => (
            <div key={item.headline} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <CheckCircle style={{ width: 13, height: 13, color: '#34d399', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: '#f1f5f9', fontSize: 11, fontWeight: 600, lineHeight: 1.3, margin: 0 }}>{item.headline}</p>
                <p style={{ color: '#64748b', fontSize: 10, margin: 0, lineHeight: 1.2 }}>{item.sub}</p>
              </div>
            </div>
          ))}
          <div className="col-span-2 flex justify-center pt-1">
            <a href="https://uk.trustpilot.com/review/openjobmarket.com" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.85 }}>
              <img src="/Trustpilot_1.png" alt="Trustpilot" loading="lazy" style={{ height: 32, width: 'auto' }} />
            </a>
          </div>
        </div>
        {/* Desktop: horizontal centred strip */}
        <div className="hidden sm:block" style={{ overflowX: 'auto', scrollbarWidth: 'none', textAlign: 'center' } as React.CSSProperties}>
          <div style={{ display: 'inline-flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', padding: '14px 24px', whiteSpace: 'nowrap' }}>
            {TRUST_ITEMS.map((item, i) => (
              <Fragment key={item.headline}>
                {i > 0 && <div style={{ width: 1, minWidth: 1, height: 32, background: 'rgba(71,85,105,0.5)', margin: '0 22px', flexShrink: 0 }} />}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                  <CheckCircle style={{ width: 16, height: 16, color: '#34d399', flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap', margin: 0 }}>{item.headline}</p>
                    <p style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap', margin: 0 }}>{item.sub}</p>
                  </div>
                </div>
              </Fragment>
            ))}
            <div style={{ width: 1, minWidth: 1, height: 32, background: 'rgba(71,85,105,0.5)', margin: '0 22px', flexShrink: 0 }} />
            <a href="https://uk.trustpilot.com/review/openjobmarket.com"
              target="_blank" rel="noopener noreferrer"
              style={{ flexShrink: 0, opacity: 0.9, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              <img src="/Trustpilot_1.png" alt="Trustpilot reviews" loading="lazy"
                style={{ height: 44, width: 'auto', display: 'block' }} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-10 sm:py-14 lg:py-16">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 -left-48 w-[480px] h-[480px] bg-emerald-500/6 rounded-full blur-3xl" />
          <div className="absolute top-10 -right-24 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative max-w-2xl text-center">
          <h1 className="text-2xl sm:text-4xl xl:text-5xl font-bold text-white leading-[1.2] mb-2">
            Open Job Market
          </h1>
          <p className="text-base sm:text-xl font-semibold text-emerald-400 mb-3">
            The Smartest Way to Find Local Tradespeople
          </p>
          <p className="text-sm sm:text-base text-slate-300 mb-7 leading-relaxed">
            Choose the option that best suits your job — contact a nearby tradesperson directly, request urgent
            help, or compare multiple quotations.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
            <Link href="/find-trades"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25">
              <Users className="w-4 h-4 flex-shrink-0" />
              Find a Tradesperson
            </Link>
            <button onClick={handlePostJob}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-600 hover:border-slate-400 active:scale-[0.97] text-slate-200 hover:text-white font-semibold rounded-xl text-base transition-all">
              <Briefcase className="w-4 h-4 flex-shrink-0" />
              Post a Job
            </button>
            <button onClick={scrollToHowItWorks}
              className="flex items-center justify-center gap-2 px-6 py-3 text-slate-400 hover:text-white font-semibold rounded-xl text-base transition-all">
              How it Works ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── See Who's Available ─────────────────────────────────────────────── */}
      <section id="sec-available" data-fade
        className={`py-10 border-t border-slate-800/60 ${fade("sec-available")}`}>
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-5 sm:p-7">
            <h2 className="text-lg sm:text-xl font-bold text-white text-center mb-4">
              🟢 See Who&apos;s Available Before You Contact Anyone
            </h2>
            <div className="rounded-xl border border-slate-700/50 overflow-hidden mb-4 max-w-md mx-auto">
              <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/40">
                <img src="/Van2.png" alt="Green van — available now" className="w-12 h-auto object-contain flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 font-semibold text-sm leading-tight">Green vans</p>
                  <p className="text-slate-400 text-xs leading-tight">Available Now</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/60 border-t border-slate-700/40">
                <img src="/Van1.png" alt="Grey van — currently busy" className="w-12 h-auto object-contain flex-shrink-0" />
                <div>
                  <p className="text-slate-300 font-semibold text-sm leading-tight">Grey vans</p>
                  <p className="text-slate-400 text-xs leading-tight">Currently Busy — can still be contacted</p>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm text-center leading-relaxed max-w-lg mx-auto">
              On the live map you can instantly see who&apos;s available right now — so you can message the right
              person and get a faster response, before you even make contact.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="sec-how" data-fade
        className={`py-12 border-t border-slate-800/60 ${fade("sec-how")}`}>
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70 mb-1">
              Three Simple Ways
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">How It Works</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              <span className="text-slate-300 font-semibold">Every job is different.</span> Whether you need an
              emergency plumber today or you&apos;re planning a kitchen renovation, Open Job Market gives you the
              right way to find local help.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 lg:gap-5">
            {HOW_OPTIONS.map(opt => (
              <div key={opt.id} className="flex flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5">
                <span className="text-3xl mb-2">{opt.emoji}</span>
                <h3 className="font-bold text-white text-base mb-1.5">{opt.title}</h3>
                <p className="text-sm text-slate-300 mb-3 leading-relaxed">{opt.intro}</p>
                <ul className="space-y-1.5 mb-3">
                  {opt.points.map(point => (
                    <li key={point} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                      <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
                {opt.footer && (
                  <p className="text-xs text-slate-500 leading-snug mt-auto pt-3 border-t border-slate-700/40">{opt.footer}</p>
                )}
              </div>
            ))}
          </div>

          {/* Decision helper */}
          <div className="mt-8 max-w-xl mx-auto">
            <h3 className="text-center text-sm font-semibold text-slate-400 mb-3">Which option should I choose?</h3>
            <div className="space-y-2">
              {DECISION_HELPER.map(row => (
                <div key={row.need} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3">
                  <span className="text-sm text-slate-300 flex-1">If you need <span className="text-white font-medium">{row.need}</span></span>
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold whitespace-nowrap flex-shrink-0">
                    <span className="text-base">{row.emoji}</span>
                    {row.option}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ──────────────────────────────────────────────────────── */}
      <section id="sec-comparison" data-fade
        className={`py-12 border-t border-slate-800/60 ${fade("sec-comparison")}`}>
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-8">
            Why Homeowners Choose{" "}
            <span className="text-emerald-400 whitespace-nowrap">Open Job Market</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <p className="text-center text-xs sm:text-sm font-bold text-slate-400 mb-4 pb-3 border-b border-slate-700">
                Other platforms
              </p>
              <ul className="space-y-3">
                {OTHERS_CONS.map(text => (
                  <li key={text} className="flex items-start gap-2">
                    <span className="text-red-400 font-bold flex-shrink-0 mt-0.5 text-sm">✕</span>
                    <span className="text-slate-400 text-xs sm:text-sm leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-5">
              <p className="text-center text-xs sm:text-sm font-bold text-emerald-400 mb-4 pb-3 border-b border-emerald-800/50">
                Open Job Market
              </p>
              <ul className="space-y-3">
                {OJM_PROS.map(text => (
                  <li key={text} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold flex-shrink-0 mt-0.5 text-sm">✓</span>
                    <span className="text-slate-100 text-xs sm:text-sm font-medium leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────────── */}
      <section id="sec-categories" data-fade
        className={`py-10 border-t border-slate-800/60 ${fade("sec-categories")}`}>
        <div className="container mx-auto px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6">
            What do you need help with?
          </h2>
          <div className="relative">
            <button onClick={() => scrollCategories("left")} aria-label="Scroll left"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-md">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={scrollRef}
              className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto px-9 pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: "grab" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
              {helpItems.map(item => (
                <button key={item.label}
                  onClick={() => handleCategory(item.industry, item.service)}
                  className="group relative rounded-2xl overflow-hidden border border-slate-700/40 hover:border-emerald-500/50 transition-all duration-200 hover:scale-[1.03] active:scale-100 shadow-md hover:shadow-xl focus:outline-none w-[28vw] h-[28vw] md:w-36 md:h-36 flex-shrink-0">
                  <img src={item.img} alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <p className="absolute bottom-2 left-0 right-0 text-center text-white text-[10px] md:text-xs font-semibold px-1.5 leading-tight drop-shadow-lg">
                    {item.label}
                  </p>
                </button>
              ))}
            </div>
            <button onClick={() => scrollCategories("right")} aria-label="Scroll right"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-md">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-sm text-slate-400 mt-5">
            <span className="text-slate-300 font-medium">Can&apos;t find the right category?</span>{" "}
            Simply post a Flexible Job and local tradespeople will contact you.
          </p>
        </div>
      </section>

      {/* ── Download App ────────────────────────────────────────────────────── */}
      <section id="sec-app" data-fade
        className={`py-12 border-t border-slate-800/60 ${fade("sec-app")}`}>
        <div className="container mx-auto px-4 max-w-lg">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-slate-800/70 backdrop-blur-sm p-6 sm:p-8 shadow-2xl shadow-emerald-900/20">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-emerald-500/8 blur-2xl scale-105" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white rounded-2xl p-3 flex-shrink-0">
                <img src="/qr-code.jpg" alt="Scan to download Open Job Market app"
                  className="w-28 h-28 object-contain rounded-lg" />
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2.5">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-bold text-base">Get the app</span>
                </div>
                <ul className="space-y-1 mb-4">
                  {["Instant replies", "Push notifications", "Faster messaging", "Better mobile experience"].map(item => (
                    <li key={item} className="flex items-center justify-center sm:justify-start gap-2 text-slate-300 text-sm">
                      <span className="text-emerald-400 flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="https://play.google.com/store/apps/details?id=com.openjobmarket.app"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-black hover:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-2.5 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0">
                    <defs>
                      <linearGradient id="gp-g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%"   stopColor="#00d4ff" />
                        <stop offset="33%"  stopColor="#00e676" />
                        <stop offset="66%"  stopColor="#ffeb3b" />
                        <stop offset="100%" stopColor="#ff5252" />
                      </linearGradient>
                    </defs>
                    <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"
                      fill="url(#gp-g)" />
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

      {/* ── Why Homeowners Love It ───────────────────────────────────────────── */}
      <section id="sec-love" data-fade
        className={`py-10 border-t border-slate-800/60 px-4 ${fade("sec-love")}`}>
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6">
            Why Homeowners Love{" "}
            <span className="text-emerald-400 whitespace-nowrap">Open Job Market</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              "See who's available now",
              "Contact tradespeople directly",
              "No lead selling",
              "No spam calls",
              "Compare multiple quotations",
              "Completely free to post jobs",
            ].map(item => (
              <div key={item} className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
                <span className="text-slate-200 text-xs sm:text-sm leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800 pt-5 pb-8 px-4">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3">
          {[
            { href: "/site-map", label: "Sitemap" },
            { href: "/about",   label: "About"   },
            { href: "/contact", label: "Contact" },
            { href: "/terms",   label: "Terms"   },
            { href: "/privacy", label: "Privacy" },
          ].map(link => (
            <Link key={link.href} href={link.href}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-center text-xs text-slate-600">© 2025 Open Job Market Ltd.</p>
      </div>

      {/* ── Post-a-Job category picker ───────────────────────────────────────── */}
      {showCategoryPicker && (
        <div className="fixed inset-0 flex flex-col bg-slate-950" style={{ zIndex: 9999 }}>
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800/80"
            style={{ paddingTop: "max(env(safe-area-inset-top,0px),12px)" }}>
            <div>
              <p className="text-base font-bold text-white">Post a Job</p>
              <p className="text-xs text-slate-400 mt-0.5">What do you need help with?</p>
            </div>
            <button onClick={() => setShowCategoryPicker(false)}
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {helpItems.map(item => (
                <button key={item.label}
                  onClick={() => pickPostJobCategory(item.industry, item.service)}
                  className="group relative rounded-xl overflow-hidden border border-slate-700/40 hover:border-emerald-500/60 active:scale-95 transition-all duration-150 shadow-md aspect-square focus:outline-none">
                  <img src={item.img} alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <p className="absolute bottom-1.5 left-0 right-0 text-center text-white text-[10px] sm:text-xs font-semibold px-1 leading-tight drop-shadow-lg">
                    {item.label}
                  </p>
                </button>
              ))}
              <button
                onClick={() => pickPostJobCategory("Not sure / Other", "")}
                className="group relative rounded-xl overflow-hidden border border-slate-600/60 hover:border-emerald-500/60 active:scale-95 transition-all duration-150 shadow-md aspect-square focus:outline-none bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/60 to-slate-900/80" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-400 group-hover:text-slate-200 transition-colors leading-none">?</span>
                  <p className="text-center text-white text-[10px] sm:text-xs font-semibold leading-tight">
                    Not sure / Other
                  </p>
                </div>
              </button>
            </div>
          </div>
          <div className="flex-shrink-0" style={{ height: "max(env(safe-area-inset-bottom,0px),8px)" }} />
        </div>
      )}

      {/* ── Job Wizard ──────────────────────────────────────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0" style={{ zIndex: 9999 }}>
          <JobWizardModal
            companyProfile={null}
            userType="homeowner"
            guestMode={!isSignedIn}
            initialIndustry={wizardIndustry}
            initialService={wizardService}
            onClose={() => setShowWizard(false)}
          />
        </div>
      )}

    </div>
  )
}
