import { generateSEO } from "@/lib/seo"
import { createClient } from "@/lib/server"
import Link from "next/link"
import { MapPin, Zap, MessageSquare, Star, Wrench, Home, Map } from "lucide-react"
import BrowseTradespeopleButton from "@/components/browse-tradespeople-button"

export const dynamic = "force-dynamic"

export const metadata = generateSEO({
  title: "About Open Job Market — Find Trusted Local Tradespeople Fast",
  description:
    "Open Job Market connects homeowners with trusted local tradespeople in minutes. Post a job, get matched, and hire with confidence.",
  path: "/about",
})

export default async function AboutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isSignedIn = !!user

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 max-w-4xl py-8 space-y-6">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-4">About Open Job Market</h1>
          <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
            <p>
              Open Job Market connects homeowners with nearby tradespeople in real time — without lead selling, spam calls, or middlemen.
            </p>
            <p className="hidden sm:block">
              If you've ever tried to find a tradesperson, you know the frustration: calling around to check availability, waiting days for quotes, or being contacted by salespeople instead of the actual professional.
            </p>
            <p className="hidden sm:block">
              Open Job Market solves this by making local trades discoverable instantly on a map.
            </p>
            <p className="hidden sm:block">
              Homeowners stay in control — compare options, message professionals directly, and hire when you're ready.
            </p>
            <p className="text-slate-300 italic text-sm">
              "Think Uber for urgent jobs, Google Maps for finding tradespeople, and Airbnb-style applications for larger projects."
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {isSignedIn ? (
              <>
                <Link href="/post-job" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors">
                  Post a Job
                </Link>
                <Link href="/find" className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors">
                  Find Tradespeople
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/sign-up" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors">
                  Get Started Free
                </Link>
                <BrowseTradespeopleButton className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors" />
              </>
            )}
          </div>
        </section>

        {/* ── Two ways ──────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            Two simple ways to find a tradesperson
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 border border-emerald-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Map className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-white">1. Discover tradespeople on the map</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-2">
                Browse nearby professionals, view profiles, reviews and availability, and contact them directly.
              </p>
              <p className="text-xs text-emerald-400 font-semibold">Instant map discovery. No waiting.</p>
            </div>
            <div className="bg-slate-800/50 border border-blue-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-sm font-bold text-white">2. Post a job</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-2">
                Describe your project, set your budget, and receive applications from local tradespeople.
              </p>
              <p className="text-xs text-slate-300">Compare responses, chat inside the app, and choose the right professional.</p>
            </div>
          </div>
        </section>

        {/* ── Why different ─────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            Why Open Job Market is different
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Traditional platforms</p>
              <ul className="space-y-3">
                {[
                  "Sell your contact details as paid leads",
                  "Multiple unwanted sales calls",
                  "Tradespeople may be far away",
                  "Slow quoting process",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="text-red-400 font-bold flex-shrink-0">✕</span>{p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-emerald-950/40 rounded-2xl border border-emerald-500/25 p-5">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-4">Open Job Market</p>
              <ul className="space-y-3">
                {[
                  "Instant map discovery of local tradespeople",
                  "Direct messaging — no spam calls",
                  "No lead selling — completely free",
                  "Fast responses for urgent jobs",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Job types ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-1 mb-3">
            Two types of jobs
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-800/50 border border-orange-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <p className="text-sm font-bold text-white">Urgent jobs</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ride-hailing style matching. Nearby tradespeople receive notifications and can respond quickly.
              </p>
            </div>
            <div className="bg-slate-800/50 border border-blue-500/25 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <p className="text-sm font-bold text-white">Flexible projects</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Compare applications, discuss details, and choose the right professional at your own pace.
              </p>
            </div>
          </div>
        </section>

        {/* ── For each audience ─────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-2xl border border-blue-500/25 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700/80 to-blue-800/80 px-4 py-3 flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-100 flex-shrink-0" />
              <div>
                <p className="text-base font-bold text-white leading-none">Find a Tradesperson</p>
                <p className="text-blue-200 text-sm mt-0.5">Find the right person, fast and locally.</p>
              </div>
            </div>
            <ul className="px-4 py-4 space-y-2.5">
              {["Post jobs with photos and budget", "Reach nearby tradespeople instantly", "Compare applications easily", "Hire with confidence using reviews"].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
            <p className="px-4 pb-4 text-xs text-emerald-400 font-semibold">Completely free for homeowners.</p>
          </div>

          <div className="bg-slate-800/60 rounded-2xl border border-orange-500/25 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600/80 to-orange-700/80 px-4 py-3 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-100 flex-shrink-0" />
              <div>
                <p className="text-base font-bold text-white leading-none">Find Jobs</p>
                <p className="text-orange-200 text-sm mt-0.5">More local work without paying for leads.</p>
              </div>
            </div>
            <ul className="px-4 py-4 space-y-2.5">
              {["See nearby jobs on a live map", "Apply instantly", "Get discovered by homeowners", "Fill gaps in your schedule"].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
            <p className="px-4 pb-4 text-xs text-emerald-400 font-semibold">Completely free for tradespeople.</p>
          </div>
        </section>

        {/* ── Trust badges ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: MapPin,        label: "Hyper-local",   sub: "Jobs near you" },
            { icon: Zap,           label: "On-demand",     sub: "ASAP or scheduled" },
            { icon: MessageSquare, label: "No cold calls", sub: "Chat in-app" },
            { icon: Star,          label: "Reviewed",      sub: "Real ratings" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Icon className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-slate-100">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-emerald-700/25 rounded-2xl p-6 text-center">
          <p className="text-lg font-bold text-white mb-1">Fast. Local. Transparent.</p>
          <p className="text-sm text-slate-400 mb-5">Find the right tradesperson without the hassle.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isSignedIn ? (
              <>
                <Link href="/post-job" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors">Post a Job</Link>
                <Link href="/find" className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors">Find Tradespeople</Link>
              </>
            ) : (
              <>
                <Link href="/auth/sign-up" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors">Create Free Account</Link>
                <BrowseTradespeopleButton className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors" />
              </>
            )}
          </div>
        </section>

      </div>
    </div>
  )
}
