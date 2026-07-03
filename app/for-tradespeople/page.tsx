"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle, Zap, Search, Send, MapPin, ArrowRight, Loader2,
} from "lucide-react"

const TRUST_ITEMS = [
  { label: "Keep 100% of what you earn",       sub: "No commission, ever" },
  { label: "No pay-per-lead",                  sub: "Browse jobs for free" },
  { label: "Apply when you're available",      sub: "Full control of your time" },
  { label: "Direct chat with homeowners",       sub: "No middleman, no calls" },
  { label: "Instant job alerts",               sub: "Never miss work nearby" },
  { label: "Grow your reputation",             sub: "Reviews build local trust" },
] as const

const HOW_STEPS = [
  {
    step: 1,
    label: "Turn on \"Available\"",
    sub: "One tap when you're ready for work",
    mockup: (
      <div style={{ background: '#020617', borderRadius: 12, border: '1px solid #1e293b', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>9:41</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <div style={{ width: 10, height: 4, borderRadius: 2, background: '#475569' }} />
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#475569' }} />
          </div>
        </div>
        <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', fontWeight: 500, margin: 0 }}>Your Status</p>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>Available</p>
            <p style={{ fontSize: 8, color: '#34d399', margin: '2px 0 0', lineHeight: 1 }}>Open for work</p>
          </div>
          <div style={{ width: 32, height: 18, borderRadius: 9, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 2 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
          <span style={{ fontSize: 8, color: '#34d399' }}>Looking for jobs</span>
        </div>
      </div>
    ),
  },
  {
    step: 2,
    label: "Receive job alerts",
    sub: "Instant alerts for jobs near you",
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
              <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>Urgent plumbing nearby</p>
              <p style={{ fontSize: 8, color: '#fed7aa', margin: 0, lineHeight: 1.2 }}>0.8 mi · Needs help today</p>
            </div>
          </div>
        </div>
        {[{ t: "Boiler repair", d: "1.2 mi", e: "£80" }, { t: "Leak fix", d: "2.1 mi", e: "£60" }].map(j => (
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
    step: 3,
    label: "Tap Apply",
    sub: "Interested? Apply in one tap — no bidding",
    mockup: (
      <div style={{ background: '#020617', borderRadius: 12, border: '1px solid #1e293b', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>9:42</span>
          <MapPin style={{ width: 10, height: 10, color: '#475569' }} />
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '6px 8px' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#fff', margin: 0 }}>🔧 Boiler repair</p>
          <p style={{ fontSize: 8, color: '#94a3b8', margin: '2px 0 0' }}>1.2 mi · Today · £80–120</p>
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {["Plumbing", "Boiler"].map(tag => (
              <span key={tag} style={{ fontSize: 7, background: '#334155', color: '#cbd5e1', padding: '2px 4px', borderRadius: 4 }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ background: '#f97316', borderRadius: 8, padding: '6px 0', textAlign: 'center', boxShadow: '0 0 12px rgba(249,115,22,0.4)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>⚡ Apply Now</span>
        </div>
        <p style={{ fontSize: 8, color: '#64748b', textAlign: 'center', margin: 0 }}>No bidding. One tap.</p>
      </div>
    ),
  },
  {
    step: 4,
    label: "Chat & arrange",
    sub: "Direct message the homeowner. No middleman.",
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
          <div style={{ background: '#334155', borderRadius: '8px 8px 8px 0', padding: '4px 8px', maxWidth: '80%' }}>
            <p style={{ fontSize: 8, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>Can you come tomorrow at 10am?</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#f97316', borderRadius: '8px 8px 0 8px', padding: '4px 8px', maxWidth: '80%' }}>
            <p style={{ fontSize: 8, color: '#fff', margin: 0, lineHeight: 1.3 }}>Yes, see you at 10! ✓</p>
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
]

export default function ForTradespeoplePageWrapper() {
  const router = useRouter()
  const [locating, setLocating] = useState(false)

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

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(51,65,85,0.5)', background: '#0f172a' }}>
        {/* Mobile: 2-col grid */}
        <div className="sm:hidden px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {TRUST_ITEMS.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <CheckCircle style={{ width: 13, height: 13, color: '#f97316', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: '#f1f5f9', fontSize: 11, fontWeight: 600, lineHeight: 1.3, margin: 0 }}>{item.label}</p>
                <p style={{ color: '#64748b', fontSize: 10, margin: 0, lineHeight: 1.2 }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop: horizontal centred strip */}
        <div className="hidden sm:block" style={{ overflowX: 'auto', scrollbarWidth: 'none', textAlign: 'center' } as React.CSSProperties}>
          <div style={{ display: 'inline-flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', padding: '14px 24px', whiteSpace: 'nowrap' }}>
            {TRUST_ITEMS.map((item, i) => (
              <div key={item.label} style={{ display: 'inline-flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', flexShrink: 0 }}>
                {i > 0 && <div style={{ width: 1, minWidth: 1, height: 32, background: 'rgba(71,85,105,0.5)', margin: '0 22px', flexShrink: 0 }} />}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                  <CheckCircle style={{ width: 16, height: 16, color: '#f97316', flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap', margin: 0 }}>{item.label}</p>
                    <p style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap', margin: 0 }}>{item.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-8 pb-6 sm:pt-12 sm:pb-8 max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/70 mb-2 text-center">
          For Tradespeople
        </p>
        <h1 className="text-lg sm:text-3xl xl:text-4xl font-bold text-white text-center leading-tight mb-3">
          Find local jobs.<br />
          <span className="text-orange-400">Work on your terms.</span>
        </h1>
        <p className="text-slate-400 text-center text-sm sm:text-base mb-6 max-w-lg mx-auto">
          Browse jobs near you, apply in one tap, and chat directly with homeowners — no lead fees, no contracts.
        </p>

        {/* CTAs */}
        <div className="flex flex-row gap-2 justify-center">
          <Link href="/auth/sign-up"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25">
            <Zap className="w-4 h-4 fill-white flex-shrink-0" />
            Join Free Today
          </Link>
          <button
            onClick={handleBrowseJobs}
            disabled={locating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-600 hover:border-slate-400 active:scale-[0.97] text-slate-200 hover:text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {locating
              ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              : <Search className="w-4 h-4 flex-shrink-0" />}
            {locating ? "Finding your location…" : "Browse Jobs"}
          </button>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-10 border-t border-slate-800/60">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400/70 mb-1">Trades need clarity.</p>
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

      {/* ── Free pricing banner ──────────────────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-slate-800 via-slate-800 to-orange-950/30 shadow-lg p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-orange-500/10 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-1 mb-3">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shadow-sm shadow-orange-400/60" />
                  <span className="text-orange-300 text-sm font-bold tracking-wide uppercase">Completely Free</span>
                </div>
                <p className="text-white font-bold text-lg sm:text-xl leading-tight">
                  No lead fees. No subscription.{" "}
                  <span className="text-orange-400">100% free</span> for tradespeople.
                </p>
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  {["No contracts", "No hidden fees", "Keep 100% of earnings"].map(item => (
                    <span key={item} className="flex items-center gap-1 text-xs text-slate-400">
                      <CheckCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Link href="/auth/sign-up"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold rounded-xl px-6 py-3 transition-all shadow-md shadow-orange-500/30 text-sm">
                  <Zap className="w-4 h-4 fill-white" />
                  Start Free Today
                </Link>
                <p className="text-[11px] text-slate-500 text-center mt-1.5">No card needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits list ───────────────────────────────────────────────── */}
      <section className="py-8 border-t border-slate-800/60 px-4">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-xl font-bold text-white text-center mb-6">Why Tradespeople Love It</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { headline: "Jobs come to you",           sub: "Get notified about nearby jobs the moment they're posted" },
              { headline: "No cold calling",            sub: "Homeowners contact you — you stay in control" },
              { headline: "Keep all your earnings",     sub: "Zero commission on every job you win" },
              { headline: "Build your reputation",      sub: "Collect reviews and grow your local presence" },
              { headline: "Flexible — work when ready", sub: "Toggle available on or off with a single tap" },
              { headline: "Instant messages",           sub: "Chat directly with homeowners — no agency in between" },
            ].map(item => (
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

      {/* ── Footer CTA ──────────────────────────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-lg text-center">
          <p className="text-2xl font-bold text-white mb-2">Ready to find more work?</p>
          <p className="text-slate-400 text-sm mb-6">Join thousands of tradespeople already using Open Job Market.</p>
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
