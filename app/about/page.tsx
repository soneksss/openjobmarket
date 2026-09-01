import { generateSEO } from "@/lib/seo"
import { createClient } from "@/lib/server"
import Link from "next/link"
import { MapPin, Zap, MessageSquare, Star, Wrench, Home, Map } from "lucide-react"
import BrowseTradespeopleButton from "@/components/browse-tradespeople-button"
import { LocalImpactSection } from "@/components/local-impact-section"

export const dynamic = "force-dynamic"

export const metadata = generateSEO({
  title: "About Open Job Market — Find Local Tradespeople Without Lead Fees",
  description:
    "Open Job Market helps you find nearby tradespeople quickly — without lead selling, spam calls, or waiting days for replies. Search on a live map, message directly, or post a job. Completely free.",
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
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              Open Job Market helps people find nearby tradespeople quickly — without lead selling, spam calls, or waiting days for replies.
            </p>
            <p>
              Search professionals directly on a live map, contact them instantly, or post a job and receive applications from local tradespeople.
            </p>
            <p>
              Unlike traditional platforms, tradespeople on Open Job Market can confirm when they are actively available for urgent work. This makes it much faster to find someone who can actually take the job today, not "maybe next week".
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {isSignedIn ? (
              <>
                <Link href="/post-job" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors">
                  Post a Job
                </Link>
                <Link href="/find-trades" className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors">
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

        {/* ── Clients can ───────────────────────────────────────────────── */}
        <section className="grid md:grid-cols-2 gap-3">
          <div className="bg-slate-800/50 border border-blue-500/25 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Home className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-sm font-bold text-white">Clients can</p>
            </div>
            <ul className="space-y-2.5">
              {[
                "View reviews and company information",
                "Message tradespeople directly",
                "Ask questions before hiring",
                "Compare applications for larger projects",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-emerald-500/25 rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-sm text-slate-300 leading-relaxed italic">
              "Think Uber for urgent jobs, Google Maps for local tradespeople, and Airbnb-style applications for larger projects."
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Zap,   label: "Urgent",   sub: "On-demand" },
                { icon: Map,   label: "Local map", sub: "Nearby trades" },
                { icon: Star,  label: "Projects",  sub: "Compare & hire" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-slate-700/40 rounded-xl p-2.5 text-center">
                  <Icon className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why different ─────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1 mb-3">
            Why it's different
          </p>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              Most trade platforms are built around selling leads. Open Job Market is built around helping people find the right tradesperson as quickly as possible.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Instead of sending your job to dozens of companies and waiting for callbacks, you can immediately see who works nearby and who is currently available for urgent jobs.
            </p>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">That means</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { icon: Zap,           text: "Faster responses" },
                  { icon: MessageSquare, text: "Less wasted time" },
                  { icon: Star,          text: "Fewer unanswered calls" },
                  { icon: Wrench,        text: "More local work for tradespeople" },
                  { icon: MapPin,        text: "Better matches for both sides" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-2 bg-slate-700/30 rounded-xl p-3">
                    <Icon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Built for local work ──────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1 mb-3">
            Built for local work
          </p>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
            <p className="text-sm text-slate-300 mb-4">Whether it's:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {[
                { icon: Zap,     label: "Urgent leak" },
                { icon: Zap,     label: "Electrical issue" },
                { icon: Wrench,  label: "Boiler repair" },
                { icon: Home,    label: "Renovation project" },
                { icon: Star,    label: "Decorating work" },
                { icon: MapPin,  label: "Property maintenance" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-slate-700/30 rounded-xl px-3 py-2.5">
                  <Icon className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-slate-300 font-medium">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Open Job Market helps people connect with nearby professionals faster and more directly.
            </p>
          </div>
        </section>

        {/* ── Local impact — "Good to know" ─────────────────────────────── */}
        <LocalImpactSection variant="homeowner" embedded />

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="bg-slate-800/50 border border-emerald-700/25 rounded-2xl p-6 text-center">
          <p className="text-lg font-bold text-white mb-1">Completely free to use.</p>
          <p className="text-sm text-slate-300 mb-5">Find the right tradesperson without the hassle.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isSignedIn ? (
              <>
                <Link href="/post-job" className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors">Post a Job</Link>
                <Link href="/find-trades" className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-colors">Find Tradespeople</Link>
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
