"use client"

import React, { useState, useRef, useEffect, Fragment } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle, ChevronLeft, ChevronRight, Zap, Map,
  Smartphone, ArrowRight, Users, Briefcase,
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
  { headline: "Verified local trades",     sub: "Every trade is vetted" },
  { headline: "Real reviews & portfolios", sub: "See previous work" },
  { headline: "Direct contact",            sub: "No middleman. No spam calls." },
  { headline: "No hidden fees",            sub: "Free to post a job" },
  { headline: "Fast replies",             sub: "Most trades reply same day" },
  { headline: "Free to post",             sub: "No subscription needed" },
] as const

const OTHERS_CONS = [
  "Sell your request as paid leads",
  "Multiple unwanted sales calls",
  "Often matched with non-local companies",
  "Slow quote process",
]
const OJM_PROS = [
  "No lead selling — fairer prices",
  "Connect directly with nearby tradespeople",
  "Message only — no spam calls",
  "Uber-style for urgent jobs, Airbnb-style for flexible work",
]

const HOW_STEPS = [
  { step: 1, label: "Post a job",          sub: "Tell us what you need done in minutes.",               img: "/Post_job_3.jpg"                    },
  { step: 2, label: "Tradespeople apply",  sub: "Local, verified tradespeople submit their interest.",  img: "/Tradesperson_get_notification.jpeg" },
  { step: 3, label: "Get replies",         sub: "Compare profiles, reviews and prices. Chat directly.", img: "/Find_tradespeople.jpg"              },
  { step: 4, label: "Compare & hire",      sub: "Choose the best person for the job.",                  img: "/View_profile.jpeg"                  },
]

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

  const handleCategory = (industry: string, service?: string) => {
    if (userType === "company") return
    setWizardIndustry(industry); setWizardService(service); setShowWizard(true)
  }

  const handlePostJob = () => {
    if (!isSignedIn) router.push("/auth/sign-up")
    else if (userType === "company") router.push("/find-trades")
    else router.push("/jobs/new")
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
    <div className="min-h-screen bg-slate-900 pb-20 md:pb-0">

      {/* ── Trust Strip ──────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(51,65,85,0.5)', background: '#0f172a' }}>
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
      <section className="relative overflow-hidden py-6 sm:py-10 lg:py-20">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 -left-48 w-[480px] h-[480px] bg-emerald-500/6 rounded-full blur-3xl" />
          <div className="absolute top-10 -right-24 w-96 h-96 bg-emerald-500/4 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* LEFT column */}
            <div>
              {/* Headline */}
              <h1 className="text-lg sm:text-3xl xl:text-5xl font-bold text-white leading-[1.2] mb-1">
                <span className="text-emerald-400">Open Job Market</span>
              </h1>
              <p className="text-base sm:text-xl xl:text-2xl font-semibold text-slate-300 mb-3">
                The Uber for Local Tradespeople
              </p>
              <p className="text-sm sm:text-base text-slate-300 mb-4 leading-relaxed">
                Find trusted local tradespeople in minutes — without lead selling, spam calls or waiting days for quotes.
              </p>

              {/* Sub-bullets */}
              <ul className="mb-6 space-y-2">
                {[
                  "Message nearby tradespeople directly",
                  "No lead-selling or unwanted sales calls",
                  "Verified local professionals with real reviews",
                  "Fast replies. Fair prices. Built for homeowners.",
                ].map(point => (
                  <li key={point} className="flex items-center gap-2 text-slate-300 text-sm">
                    <span className="text-emerald-400 flex-shrink-0">✅</span>
                    {point}
                  </li>
                ))}
              </ul>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/find-trades"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-emerald-500/25">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  Find a Tradesperson
                </Link>
                <Link href="/find-jobs"
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-600 hover:border-slate-400 active:scale-[0.97] text-slate-200 hover:text-white font-semibold rounded-xl text-base transition-all">
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  Find Jobs
                </Link>
              </div>

              {/* Mobile app download — shown only on small screens */}
              <a href="https://play.google.com/store/apps/details?id=com.openjobmarket.app"
                target="_blank" rel="noopener noreferrer"
                className="sm:hidden mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-black border border-slate-700 rounded-xl text-white text-sm font-medium">
                <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                Download the App
              </a>
            </div>

            {/* RIGHT column — App download card */}
            <div className="hidden lg:flex justify-end">
              <div className="relative w-full max-w-xs sm:max-w-sm">
                {/* Halo glow */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-emerald-500/12 blur-2xl scale-105" />
                <div className="relative bg-slate-800/70 backdrop-blur-sm border border-emerald-500/30 rounded-3xl p-6 shadow-2xl shadow-emerald-900/20 hover:-translate-y-1 hover:shadow-emerald-800/30 transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span className="text-white font-bold text-base">Download our App</span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">
                    Get instant messages, push notifications, application updates and a better mobile experience.
                  </p>
                  {/* QR code */}
                  <div className="bg-white rounded-2xl p-3 mb-5">
                    <img src="/qr-code.jpg" alt="Scan to download Open Job Market app"
                      className="w-full h-auto rounded-lg" />
                  </div>
                  {/* Google Play badge */}
                  <a href="https://play.google.com/store/apps/details?id=com.openjobmarket.app"
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full bg-black hover:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-2.5 transition-colors">
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

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="sec-how" data-fade
        className={`py-12 border-t border-slate-800/60 ${fade("sec-how")}`}>
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/70 mb-1">
              Simple &amp; Fast
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white">How It Works</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {HOW_STEPS.map(item => (
              <div key={item.step} className="flex flex-col gap-2 group">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {item.step}
                  </span>
                  <p className="text-sm font-bold text-white leading-tight">{item.label}</p>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-lg bg-slate-950 group-hover:border-emerald-500/30 group-hover:shadow-xl group-hover:shadow-emerald-900/20 transition-all duration-200">
                  <img src={item.img} alt={item.label} loading="lazy" decoding="async"
                    className="w-full h-auto object-contain" />
                </div>
                <p className="text-xs text-slate-400 leading-snug">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section id="sec-cta" data-fade
        className={`py-10 border-t border-slate-800/60 ${fade("sec-cta")}`}>
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-slate-800 via-slate-800 to-amber-950/20 shadow-lg p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center gap-5">
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-xl">⚡</span>
                  <p className="text-white font-bold text-lg sm:text-xl">Need it done today?</p>
                </div>
                <p className="text-slate-400 text-sm mt-1">Alert nearby available trades instantly.</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
                <button onClick={handlePostJob}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.97] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-all shadow-md shadow-amber-500/30">
                  <Zap className="w-3.5 h-3.5 fill-white flex-shrink-0" />
                  Post Urgent Job
                </button>
                <Link href="/find-trades"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl px-5 py-2.5 text-sm transition-colors border border-slate-600">
                  <Map className="w-3.5 h-3.5 flex-shrink-0" />
                  View Available
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Promise ─────────────────────────────────────────────────────── */}
      <section id="sec-promise" data-fade
        className={`py-10 border-t border-slate-800/60 ${fade("sec-promise")}`}>
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="space-y-4 text-[15px] text-slate-300 leading-relaxed">
            <p className="font-bold text-white text-lg">Open Job Market is free to use.</p>

            <p>Our mission is to connect homeowners directly with trusted local tradespeople — without lead selling, hidden fees or unwanted sales calls.</p>

            <p>Unlike many platforms, we don't charge tradespeople for every lead or make homeowners pay to post a job.</p>

            <p>If, in the future, Open Job Market grows into a service that genuinely saves people time and money, we may introduce a small membership (around <strong className="text-white">£10/month</strong>) simply to help cover running costs and continue improving the platform.</p>

            <p className="text-white font-medium">Only if the platform delivers real value.</p>

            <p className="text-white font-semibold">That's our promise.</p>

            <ul className="pt-1 space-y-2.5">
              {[
                "No lead selling",
                "No hidden charges",
                "No surprise subscriptions",
                "Built for people, not investors",
              ].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✔</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
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

      {/* ── Job Wizard ──────────────────────────────────────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0" style={{ zIndex: 60 }}>
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
